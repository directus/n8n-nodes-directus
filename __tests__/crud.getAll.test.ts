import { describe, it, expect, vi } from 'vitest';
import type { IExecuteFunctions } from 'n8n-workflow';
import { executeGetAll, type MakeRequestFn } from '../nodes/Directus/methods/crud';

function createContext(params: Record<string, unknown>): IExecuteFunctions {
	return {
		getNodeParameter: (name: string, _index: number, fallback?: unknown) =>
			params[name] !== undefined ? params[name] : fallback,
		getNode: () => ({ name: 'Directus' }),
	} as unknown as IExecuteFunctions;
}

function page(ids: number[]) {
	return { data: ids.map((id) => ({ id })) };
}

describe('executeGetAll', () => {
	it('sends the requested limit when Return All is off', async () => {
		const makeRequest = vi.fn<MakeRequestFn>().mockResolvedValue(page([1, 2]));

		await executeGetAll(
			createContext({ returnAll: false, limit: 25, itemFields: [] }),
			0,
			makeRequest,
			'/items/articles',
			'itemFields',
		);

		expect(makeRequest).toHaveBeenCalledTimes(1);
		expect(makeRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'GET',
				url: '/items/articles',
				qs: { limit: 25 },
			}),
		);
	});

	it('paginates with offset until filter_count is reached when Return All is on', async () => {
		const firstPage = Array.from({ length: 100 }, (_, i) => i + 1);
		const tail = Array.from({ length: 12 }, (_, i) => i + 101);
		const makeRequest = vi
			.fn<MakeRequestFn>()
			.mockResolvedValueOnce({
				data: firstPage.map((id) => ({ id })),
				meta: { filter_count: 112 },
			})
			.mockResolvedValueOnce({
				data: tail.map((id) => ({ id })),
				meta: { filter_count: 112 },
			});

		const result = (await executeGetAll(
			createContext({ returnAll: true, limit: 50, itemFields: ['id'] }),
			0,
			makeRequest,
			'/items/articles',
			'itemFields',
		)) as { data: Array<{ id: number }> };

		expect(result.data).toHaveLength(112);
		expect(makeRequest).toHaveBeenCalledTimes(2);
		expect(makeRequest).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				qs: { offset: 0, meta: 'filter_count', fields: 'id' },
			}),
		);
		expect(makeRequest).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				qs: { offset: 100, meta: 'filter_count', fields: 'id' },
			}),
		);
		expect(makeRequest.mock.calls[0][0].qs).not.toHaveProperty('limit');
	});

	it('advances offset by the page actually returned when QUERY_LIMIT_MAX is lower than 100', async () => {
		const makeRequest = vi
			.fn<MakeRequestFn>()
			.mockResolvedValueOnce({
				data: [1, 2, 3, 4, 5].map((id) => ({ id })),
				meta: { filter_count: 12 },
			})
			.mockResolvedValueOnce({
				data: [6, 7, 8, 9, 10].map((id) => ({ id })),
				meta: { filter_count: 12 },
			})
			.mockResolvedValueOnce({
				data: [11, 12].map((id) => ({ id })),
				meta: { filter_count: 12 },
			});

		const result = (await executeGetAll(
			createContext({ returnAll: true, limit: 50 }),
			0,
			makeRequest,
			'/items/articles',
		)) as { data: Array<{ id: number }> };

		expect(result.data.map((item) => item.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
		expect(makeRequest).toHaveBeenCalledTimes(3);
		expect(makeRequest).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ qs: { offset: 5, meta: 'filter_count' } }),
		);
		expect(makeRequest).toHaveBeenNthCalledWith(
			3,
			expect.objectContaining({ qs: { offset: 10, meta: 'filter_count' } }),
		);
	});

	it('does not send limit=-1', async () => {
		const makeRequest = vi
			.fn<MakeRequestFn>()
			.mockResolvedValue({ data: [{ id: 1 }], meta: { filter_count: 1 } });

		await executeGetAll(createContext({ returnAll: true, limit: 50 }), 0, makeRequest, '/users');

		expect(makeRequest).toHaveBeenCalledTimes(1);
		for (const call of makeRequest.mock.calls) {
			expect(call[0].qs).not.toMatchObject({ limit: -1 });
			expect(call[0].qs).not.toHaveProperty('limit');
		}
	});

	it('falls back to an empty page when filter_count is missing', async () => {
		const makeRequest = vi
			.fn<MakeRequestFn>()
			.mockResolvedValueOnce(page([1, 2, 3]))
			.mockResolvedValueOnce({ data: [] });

		const result = (await executeGetAll(
			createContext({ returnAll: true, limit: 50 }),
			0,
			makeRequest,
			'/items/articles',
		)) as { data: Array<{ id: number }> };

		expect(result.data).toHaveLength(3);
		expect(makeRequest).toHaveBeenCalledTimes(2);
		expect(makeRequest).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ qs: { offset: 3, meta: 'filter_count' } }),
		);
	});

	it('returns an empty list when the collection is empty', async () => {
		const makeRequest = vi.fn<MakeRequestFn>().mockResolvedValue({ data: [] });

		const result = await executeGetAll(
			createContext({ returnAll: true, limit: 50 }),
			0,
			makeRequest,
			'/items/articles',
		);

		expect(result).toEqual({ data: [] });
		expect(makeRequest).toHaveBeenCalledTimes(1);
	});
});

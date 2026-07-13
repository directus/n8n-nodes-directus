const DEFAULT_MAX_ERROR_PAYLOAD_LENGTH = 8000;

export function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function safeStringify(value: unknown): string {
	const seen = new WeakSet<object>();

	try {
		const result = JSON.stringify(value, (_key, currentValue) => {
			if (typeof currentValue === 'bigint') {
				return currentValue.toString();
			}

			if (isObject(currentValue)) {
				if (seen.has(currentValue)) {
					return '[Circular]';
				}
				seen.add(currentValue);
			}

			return currentValue;
		});

		return result ?? String(value);
	} catch {
		try {
			return String(value);
		} catch {
			return '[Unserializable]';
		}
	}
}

export function truncateText(text: string, maxLength = DEFAULT_MAX_ERROR_PAYLOAD_LENGTH): string {
	if (text.length <= maxLength) {
		return text;
	}

	return `${text.slice(0, maxLength)}... [truncated]`;
}

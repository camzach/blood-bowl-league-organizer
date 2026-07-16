type QueryFragment = {
  with?: Record<string, any>;
  columns?: Record<string, boolean>;
  where?: any;
  [key: string]: any;
};

export function mergeQueryFragments<T extends QueryFragment>(
  base: T,
  override: Partial<T>,
): T {
  const result = { ...base };

  if (override.with && base.with) {
    result.with = {};
    const allKeys = new Set([
      ...Object.keys(base.with),
      ...Object.keys(override.with),
    ]);

    for (const key of allKeys) {
      const baseValue = base.with[key];
      const overrideValue = override.with[key];

      if (overrideValue && baseValue && typeof baseValue === "object") {
        result.with[key] = mergeQueryFragments(baseValue, overrideValue);
      } else {
        result.with[key] = overrideValue ?? baseValue;
      }
    }
  } else if (override.with) {
    result.with = override.with as any;
  }

  if (override.columns) {
    result.columns = { ...base.columns, ...override.columns } as any;
  }

  for (const key of Object.keys(override)) {
    if (key !== "with" && key !== "columns") {
      (result as any)[key] = override[key];
    }
  }

  return result;
}
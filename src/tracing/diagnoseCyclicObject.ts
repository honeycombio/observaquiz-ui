/**
 * Serializes an object with cyclic references by tracking visited objects
 * and marking cyclic paths in the output.
 *
 * @param obj - The object to serialize
 * @param maxDepth - Maximum recursion depth
 * @param spacing - Indentation spacing
 * @returns Serialized representation of the object
 */
function serializeCyclicObject(
  obj: any,
  maxDepth: number = 100,
  spacing: number = 2
): string {
  // Track visited objects to detect cycles
  const visited = new WeakMap<object, boolean>();
  // Path tracking for better cycle reporting
  const pathMap = new WeakMap<object, string>();

  function serialize(
    value: any,
    currentPath: string = "",
    depth: number = 0
  ): string {
    // Handle maximum recursion depth
    if (depth > maxDepth) {
      return `"[MAX_DEPTH_EXCEEDED]"`;
    }

    // Handle primitive types
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "boolean" || typeof value === "number")
      return String(value);
    if (typeof value === "string") return JSON.stringify(value);
    if (typeof value === "function")
      return `"[Function: ${value.name || "anonymous"}]"`;
    if (typeof value === "symbol")
      return `"[Symbol: ${value.toString().slice(7, -1)}]"`;
    if (value instanceof Date) return `"[Date: ${value.toISOString()}]"`;
    if (value instanceof RegExp) return `"[RegExp: ${value.toString()}]"`;

    // Handle arrays and objects (reference types)
    if (typeof value === "object") {
      // Check if we've seen this object before
      if (visited.has(value)) {
        const cyclePath = pathMap.get(value);
        return `"[Circular Reference -> ${cyclePath}]"`;
      }

      // Mark as visited and store path
      visited.set(value, true);
      pathMap.set(value, currentPath || "root");

      // Handle arrays
      if (Array.isArray(value)) {
        const items = value.map((item, index) =>
          serialize(item, `${currentPath}[${index}]`, depth + 1)
        );

        // Format array output
        const indent = " ".repeat(spacing * depth);
        const childIndent = " ".repeat(spacing * (depth + 1));
        if (items.length === 0) return "[]";

        return `[\n${childIndent}${items.join(
          `,\n${childIndent}`
        )}\n${indent}]`;
      }

      // Handle regular objects
      const props = Object.entries(value).map(([key, val]) => {
        const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
          ? key
          : JSON.stringify(key);
        return `${keyStr}: ${serialize(
          val,
          `${currentPath}.${key}`,
          depth + 1
        )}`;
      });

      // Format object output
      const indent = " ".repeat(spacing * depth);
      const childIndent = " ".repeat(spacing * (depth + 1));
      if (props.length === 0) return "{}";

      return `{\n${childIndent}${props.join(`,\n${childIndent}`)}\n${indent}}`;
    }

    // Fallback for any types not explicitly handled
    return `"[Unknown Type: ${typeof value}]"`;
  }

  return serialize(obj);
}

// Example usage:
function testCyclicSerialization(): void {
  // Create an object with circular references
  interface TestObject {
    name: string;
    value: number;
    nested: {
      a: number;
      b: number;
      parent?: TestObject;
    };
    self?: TestObject;
    nestedArray?: Array<number | object>;
  }

  const obj: TestObject = {
    name: "Test Object",
    value: 42,
    nested: {
      a: 1,
      b: 2,
    },
  };

  // Create a circular reference
  obj.self = obj;
  obj.nested.parent = obj;
  obj.nestedArray = [1, 2, { backRef: obj }];

  console.log(serializeCyclicObject(obj));
}

// Export the function
export { serializeCyclicObject };

// Uncomment to test
// testCyclicSerialization();

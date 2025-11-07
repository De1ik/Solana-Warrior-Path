import { serialize } from "borsh";

export function serializeAccount<T>(
    schema: Map<any, any>,
    classType: any,
    data: T
): Buffer {
    return Buffer.from(serialize(schema, new classType(data)))
}
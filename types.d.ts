// In file: BIZ-PERDA-MAIN/types.d.ts

// This tells TypeScript about the 'base-64' module
declare module 'base-64' {
  export function encode(input: string): string;
  export function decode(input: string): string;
}

// This tells TypeScript that ArrayBuffer has a 'from' method now
interface ArrayBufferConstructor {
  from(base64: string): ArrayBuffer;
}

// types.d.ts
declare module 'base64-arraybuffer' {
  export function encode(buffer: ArrayBuffer): string;
  export function decode(base64: string): ArrayBuffer;
}

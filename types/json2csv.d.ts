declare module "json2csv" {
  export class Parser<T extends object = Record<string, unknown>> {
    parse(input: T[]): string;
  }
}

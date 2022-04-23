import {TokenHandler} from 'tokenizer-dsl';
import {jsonTokenizer, Type} from './jsonTokenizer';
import {revive} from './revive';
import {Reviver} from './types';

export interface ParserContext {
  stack: any[];
  cursor: number;
  arrayMode: boolean;
  objectKey: string | null;
  input: string;
  parseBigInt: (str: string) => unknown;
}

function put(value: any, context: ParserContext): void {
  const {stack, cursor} = context;

  if (context.arrayMode) {
    stack[cursor].push(value);
    return;
  }

  const {objectKey} = context;

  if (objectKey === null) {
    die('Object key expected');
  }
  stack[cursor][objectKey] = value;
  context.objectKey = null;
}

const jsonTokenHandler: TokenHandler<Type, ParserContext> = {

  token(type, offset, length, context) {
    switch (type) {

      case Type.OBJECT_START: {
        const value = {};
        put(value, context);
        context.stack[++context.cursor] = value;
        context.arrayMode = false;
        break;
      }

      case Type.OBJECT_END:
        if (context.arrayMode) {
          die('Unexpected object end');
        }
        context.arrayMode = context.stack[--context.cursor] instanceof Array;
        break;

      case Type.ARRAY_START: {
        const value: any[] = [];
        put(value, context);
        context.stack[++context.cursor] = value;
        context.arrayMode = true;
        break;
      }

      case Type.ARRAY_END:
        if (!context.arrayMode) {
          die('Unexpected array end');
        }
        context.arrayMode = context.stack[--context.cursor] instanceof Array;
        break;

      case Type.STRING: {
        const parent = context.stack[context.cursor];
        const value = context.input.substr(offset + 1, length - 2);

        if (context.arrayMode) {
          parent.push(value);
          break;
        }

        const {objectKey} = context;

        if (objectKey === null) {
          context.objectKey = value;
        } else {
          parent[objectKey] = value;
          context.objectKey = null;
        }
        break;
      }

      case Type.COLON:
        break;

      case Type.NUMBER:
        put(parseFloat(context.input.substr(offset, length)), context);
        break;
      case Type.BIGINT:
        put(context.parseBigInt(context.input.substr(offset, length)), context);
        break;
      case Type.TRUE:
        put(true, context);
        break;
      case Type.FALSE:
        put(false, context);
        break;
      case Type.NULL:
        put(null, context);
        break;
    }
  },

  unrecognizedToken(offset, context) {
    die('Unexpected char at ' + offset);
  },

  error(type, offset, errorCode, context) {
  },
};

export function parseJson(input: string, reviver?: Reviver, parseBigInt: (str: string) => unknown = BigInt): any {
  const parent = {'': null};

  jsonTokenizer(input, jsonTokenHandler, {
    stack: [parent],
    cursor: 0,
    arrayMode: false,
    objectKey: '',
    input,
    parseBigInt,
  });

  return reviver ? revive(parent, '', reviver) : parent[''];
}

function die(message?: string): never {
  throw new Error(message);
}
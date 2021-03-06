import * as fs from 'fs';
import * as path from 'path';
import {parseJson} from '../main/parseJson';

describe('parseJson', () => {

  test('parses string', () => {
    expect(parseJson('"aaa"')).toBe('aaa');
  });

  test('resolves encoded chars string', () => {
    expect(parseJson('"con\\u0073\\u0074\\u0072\\u0075\\u0063tor"')).toBe('constructor');
  });

  test('parses number', () => {
    expect(parseJson('123.0')).toBe(123);
  });

  test('parses bigint', () => {
    expect(parseJson('123')).toBe(BigInt(123));
  });

  test('parses true', () => {
    expect(parseJson('true')).toBe(true);
  });

  test('parses false', () => {
    expect(parseJson('false')).toBe(false);
  });

  test('parses null', () => {
    expect(parseJson('null')).toBe(null);
  });

  test('parses object', () => {
    expect(parseJson('{}')).toEqual({});
  });

  test('parses object with properties', () => {
    expect(parseJson('{"foo":"abc","bar":123}')).toEqual({foo: 'abc', bar: BigInt(123)});
  });

  test('parses nested objects', () => {
    expect(parseJson('{"foo":{"bar":123.0}}')).toEqual({foo: {bar: 123}});
  });

  test('prevents prototype poisoning', () => {
    expect(parseJson('{"__proto__":"okay"}').__proto__).toBe('okay');
    expect(parseJson('{"\\u005f\\u005f\\u0070\\u0072\\u006f\\u0074\\u006f\\u005f\\u005f":"okay"}').__proto__).toBe('okay');
  });

  test('prevents constructor poisoning', () => {
    expect(parseJson('{"constructor":"okay"}').constructor).toBe('okay');
    expect(parseJson('{"\\u0063\\u006f\\u006e\\u0073\\u0074\\u0072\\u0075\\u0063\\u0074\\u006f\\u0072":"okay"}').constructor).toBe('okay');
  });

  test('__proto__ is  writable', () => {
    const obj = parseJson('{"__proto__":"okay"}');
    obj.__proto__ = 123;
    expect(obj.__proto__).toBe(123);
  });

  test('parses array', () => {
    expect(parseJson('[]')).toEqual([]);
  });

  test('parses array with items', () => {
    expect(parseJson('["foo", 123]')).toEqual(['foo', BigInt(123)]);
  });

  test('parses nested arrays', () => {
    expect(parseJson('[["foo"], [123]]')).toEqual([['foo'], [BigInt(123)]]);
  });

  test('parses mixed objects and arrays', () => {
    expect(parseJson('[{"foo":"abc"}]')).toEqual([{foo: 'abc'}]);
  });

  test('parses huge input', () => {
    const json = fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8');

    expect(parseJson(json, undefined, parseInt)).toEqual(JSON.parse(json));
  });

  test('throws on object after string', () => {
    expect(() => parseJson('"aaa"{}')).toThrow('Unexpected token at position 5');
  });

  test('throws on string after object', () => {
    expect(() => parseJson('{}"aaa"')).toThrow('Unexpected token at position 2');
  });

  test('throws on comma after payload end', () => {
    expect(() => parseJson('{},')).toThrow('Unexpected token at position 2');
  });

  test('throws on absent object key', () => {
    expect(() => parseJson('{"aaa":111,222}')).toThrow('Object key expected at position 11');
  });
});

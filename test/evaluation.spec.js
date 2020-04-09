/**
 * Copyright 2018 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const utils = require('./utils');
const expect = require('expect');
const {getTestState,setupTestBrowserHooks, setupTestPageAndContextHooks} = require('./mocha-utils');

const bigint = typeof BigInt !== 'undefined';

describe('Evaluation specs', function() {
  setupTestBrowserHooks();
  setupTestPageAndContextHooks();

  describe('Page.evaluate', function() {

    it('should work', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(() => 7 * 3);
      expect(result).toBe(21);
    });
    (bigint ? itFailsFirefox : xit)('should transfer BigInt', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(a => a, BigInt(42));
      expect(result).toBe(BigInt(42));
    });
    itFailsFirefox('should transfer NaN', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(a => a, NaN);
      expect(Object.is(result, NaN)).toBe(true);
    });
    itFailsFirefox('should transfer -0', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(a => a, -0);
      expect(Object.is(result, -0)).toBe(true);
    });
    itFailsFirefox('should transfer Infinity', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(a => a, Infinity);
      expect(Object.is(result, Infinity)).toBe(true);
    });
    itFailsFirefox('should transfer -Infinity', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(a => a, -Infinity);
      expect(Object.is(result, -Infinity)).toBe(true);
    });
    it('should transfer arrays', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(a => a, [1, 2, 3]);
      expect(result).toEqual([1,2,3]);
    });
    it('should transfer arrays as arrays, not objects', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(a => Array.isArray(a), [1, 2, 3]);
      expect(result).toBe(true);
    });
    it('should modify global environment', async() => {
      const { page } = getTestState();

      await page.evaluate(() => window.globalVar = 123);
      expect(await page.evaluate('globalVar')).toBe(123);
    });
    it('should evaluate in the page context', async() => {
      const { page, server } = getTestState();

      await page.goto(server.PREFIX + '/global-var.html');
      expect(await page.evaluate('globalVar')).toBe(123);
    });
    itFailsFirefox('should return undefined for objects with symbols', async() => {
      const { page } = getTestState();

      expect(await page.evaluate(() => [Symbol('foo4')])).toBe(undefined);
    });
    it('should work with function shorthands', async() => {
      const { page } = getTestState();

      const a = {
        sum(a, b) { return a + b; },

        async mult(a, b) { return a * b; }
      };
      expect(await page.evaluate(a.sum, 1, 2)).toBe(3);
      expect(await page.evaluate(a.mult, 2, 4)).toBe(8);
    });
    it('should work with unicode chars', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(a => a['中文字符'], {'中文字符': 42});
      expect(result).toBe(42);
    });
    itFailsFirefox('should throw when evaluation triggers reload', async() => {
      const { page } = getTestState();

      let error = null;
      await page.evaluate(() => {
        location.reload();
        return new Promise(() => {});
      }).catch(e => error = e);
      expect(error.message).toContain('Protocol error');
    });
    it('should await promise', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(() => Promise.resolve(8 * 7));
      expect(result).toBe(56);
    });
    it('should work right after framenavigated', async() => {
      const { page, server } = getTestState();

      let frameEvaluation = null;
      page.on('framenavigated', async frame => {
        frameEvaluation = frame.evaluate(() => 6 * 7);
      });
      await page.goto(server.EMPTY_PAGE);
      expect(await frameEvaluation).toBe(42);
    });
    itFailsFirefox('should work from-inside an exposed function', async() => {
      const { page } = getTestState();

      // Setup inpage callback, which calls Page.evaluate
      await page.exposeFunction('callController', async function(a, b) {
        return await page.evaluate((a, b) => a * b, a, b);
      });
      const result = await page.evaluate(async function() {
        return await callController(9, 3);
      });
      expect(result).toBe(27);
    });
    it('should reject promise with exception', async() => {
      const { page } = getTestState();

      let error = null;
      await page.evaluate(() => not_existing_object.property).catch(e => error = e);
      expect(error).toBeTruthy();
      expect(error.message).toContain('not_existing_object');
    });
    it('should support thrown strings as error messages', async() => {
      const { page } = getTestState();

      let error = null;
      await page.evaluate(() => { throw 'qwerty'; }).catch(e => error = e);
      expect(error).toBeTruthy();
      expect(error.message).toContain('qwerty');
    });
    it('should support thrown numbers as error messages', async() => {
      const { page } = getTestState();

      let error = null;
      await page.evaluate(() => { throw 100500; }).catch(e => error = e);
      expect(error).toBeTruthy();
      expect(error.message).toContain('100500');
    });
    it('should return complex objects', async() => {
      const { page } = getTestState();

      const object = {foo: 'bar!'};
      const result = await page.evaluate(a => a, object);
      expect(result).not.toBe(object);
      expect(result).toEqual(object);
    });
    (bigint ? itFailsFirefox : xit)('should return BigInt', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(() => BigInt(42));
      expect(result).toBe(BigInt(42));
    });
    itFailsFirefox('should return NaN', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(() => NaN);
      expect(Object.is(result, NaN)).toBe(true);
    });
    itFailsFirefox('should return -0', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(() => -0);
      expect(Object.is(result, -0)).toBe(true);
    });
    itFailsFirefox('should return Infinity', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(() => Infinity);
      expect(Object.is(result, Infinity)).toBe(true);
    });
    itFailsFirefox('should return -Infinity', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(() => -Infinity);
      expect(Object.is(result, -Infinity)).toBe(true);
    });
    it('should accept "undefined" as one of multiple parameters', async() => {
      const { page } = getTestState();

      const result = await page.evaluate((a, b) => Object.is(a, undefined) && Object.is(b, 'foo'), undefined, 'foo');
      expect(result).toBe(true);
    });
    it('should properly serialize null fields', async() => {
      const { page } = getTestState();

      expect(await page.evaluate(() => ({a: undefined}))).toEqual({});
    });
    itFailsFirefox('should return undefined for non-serializable objects', async() => {
      const { page } = getTestState();

      expect(await page.evaluate(() => window)).toBe(undefined);
    });
    itFailsFirefox('should fail for circular object', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(() => {
        const a = {};
        const b = {a};
        a.b = b;
        return a;
      });
      expect(result).toBe(undefined);
    });
    itFailsFirefox('should be able to throw a tricky error', async() => {
      const { page } = getTestState();

      const windowHandle = await page.evaluateHandle(() => window);
      const errorText = await windowHandle.jsonValue().catch(e => e.message);
      const error = await page.evaluate(errorText => {
        throw new Error(errorText);
      }, errorText).catch(e => e);
      expect(error.message).toContain(errorText);
    });
    it('should accept a string', async() => {
      const { page } = getTestState();

      const result = await page.evaluate('1 + 2');
      expect(result).toBe(3);
    });
    it('should accept a string with semi colons', async() => {
      const { page } = getTestState();

      const result = await page.evaluate('1 + 5;');
      expect(result).toBe(6);
    });
    it('should accept a string with comments', async() => {
      const { page } = getTestState();

      const result = await page.evaluate('2 + 5;\n// do some math!');
      expect(result).toBe(7);
    });
    itFailsFirefox('should accept element handle as an argument', async() => {
      const { page } = getTestState();

      await page.setContent('<section>42</section>');
      const element = await page.$('section');
      const text = await page.evaluate(e => e.textContent, element);
      expect(text).toBe('42');
    });
    itFailsFirefox('should throw if underlying element was disposed', async() => {
      const { page } = getTestState();

      await page.setContent('<section>39</section>');
      const element = await page.$('section');
      expect(element).toBeTruthy();
      await element.dispose();
      let error = null;
      await page.evaluate(e => e.textContent, element).catch(e => error = e);
      expect(error.message).toContain('JSHandle is disposed');
    });
    itFailsFirefox('should throw if elementHandles are from other frames', async() => {
      const { page, server } = getTestState();

      await utils.attachFrame(page, 'frame1', server.EMPTY_PAGE);
      const bodyHandle = await page.frames()[1].$('body');
      let error = null;
      await page.evaluate(body => body.innerHTML, bodyHandle).catch(e => error = e);
      expect(error).toBeTruthy();
      expect(error.message).toContain('JSHandles can be evaluated only in the context they were created');
    });
    itFailsFirefox('should simulate a user gesture', async() => {
      const { page } = getTestState();

      const result = await page.evaluate(() => {
        document.body.appendChild(document.createTextNode('test'));
        document.execCommand('selectAll');
        return document.execCommand('copy');
      });
      expect(result).toBe(true);
    });
    itFailsFirefox('should throw a nice error after a navigation', async() => {
      const { page } = getTestState();

      const executionContext = await page.mainFrame().executionContext();

      await Promise.all([
        page.waitForNavigation(),
        executionContext.evaluate(() => window.location.reload())
      ]);
      const error = await executionContext.evaluate(() => null).catch(e => e);
      expect(error.message).toContain('navigation');
    });
    itFailsFirefox('should not throw an error when evaluation does a navigation', async() => {
      const { page, server } = getTestState();

      await page.goto(server.PREFIX + '/one-style.html');
      const result = await page.evaluate(() => {
        window.location = '/empty.html';
        return [42];
      });
      expect(result).toEqual([42]);
    });
    itFailsFirefox('should transfer 100Mb of data from page to node.js', async function() {
      const { page } = getTestState();

      const a = await page.evaluate(() => Array(100 * 1024 * 1024 + 1).join('a'));
      expect(a.length).toBe(100 * 1024 * 1024);
    });
    it('should throw error with detailed information on exception inside promise ', async() => {
      const { page } = getTestState();

      let error = null;
      await page.evaluate(() => new Promise(() => {
        throw new Error('Error in promise');
      })).catch(e => error = e);
      expect(error.message).toContain('Error in promise');
    });
  });

  describeFailsFirefox('Page.evaluateOnNewDocument', function() {
    it('should evaluate before anything else on the page', async() => {
      const { page, server } = getTestState();

      await page.evaluateOnNewDocument(function(){
        window.injected = 123;
      });
      await page.goto(server.PREFIX + '/tamperable.html');
      expect(await page.evaluate(() => window.result)).toBe(123);
    });
    it('should work with CSP', async() => {
      const { page, server } = getTestState();

      server.setCSP('/empty.html', 'script-src ' + server.PREFIX);
      await page.evaluateOnNewDocument(function(){
        window.injected = 123;
      });
      await page.goto(server.PREFIX + '/empty.html');
      expect(await page.evaluate(() => window.injected)).toBe(123);

      // Make sure CSP works.
      await page.addScriptTag({content: 'window.e = 10;'}).catch(e => void e);
      expect(await page.evaluate(() => window.e)).toBe(undefined);
    });
  });

  describe('Frame.evaluate', function() {
    itFailsFirefox('should have different execution contexts', async() => {
      const { page, server } = getTestState();

      await page.goto(server.EMPTY_PAGE);
      await utils.attachFrame(page, 'frame1', server.EMPTY_PAGE);
      expect(page.frames().length).toBe(2);
      await page.frames()[0].evaluate(() => window.FOO = 'foo');
      await page.frames()[1].evaluate(() => window.FOO = 'bar');
      expect(await page.frames()[0].evaluate(() => window.FOO)).toBe('foo');
      expect(await page.frames()[1].evaluate(() => window.FOO)).toBe('bar');
    });
    itFailsFirefox('should have correct execution contexts', async() => {
      const { page, server } = getTestState();

      await page.goto(server.PREFIX + '/frames/one-frame.html');
      expect(page.frames().length).toBe(2);
      expect(await page.frames()[0].evaluate(() => document.body.textContent.trim())).toBe('');
      expect(await page.frames()[1].evaluate(() => document.body.textContent.trim())).toBe(`Hi, I'm frame`);
    });
    it('should execute after cross-site navigation', async() => {
      const { page, server } = getTestState();

      await page.goto(server.EMPTY_PAGE);
      const mainFrame = page.mainFrame();
      expect(await mainFrame.evaluate(() => window.location.href)).toContain('localhost');
      await page.goto(server.CROSS_PROCESS_PREFIX + '/empty.html');
      expect(await mainFrame.evaluate(() => window.location.href)).toContain('127');
    });
  });
});

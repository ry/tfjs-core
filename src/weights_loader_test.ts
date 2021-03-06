/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import * as tf from './index';
import {CPU_ENVS, describeWithFlags, expectArraysClose} from './test_util';
import {WeightsManifestConfig} from './weights_loader';

describeWithFlags('loadWeights', CPU_ENVS, () => {
  const setupFakeWeightFiles =
      (fileBufferMap:
           {[filename: string]: Float32Array|Int32Array|ArrayBuffer}) => {
        spyOn(window, 'fetch').and.callFake((path: string) => {
          return new Response(fileBufferMap[path]);
        });
      };

  it('1 group, 1 weight, 1 requested weight', done => {
    setupFakeWeightFiles({'./weightfile0': new Float32Array([1, 2, 3])});

    const manifest: WeightsManifestConfig = [{
      'paths': ['weightfile0'],
      'weights': [{'name': 'weight0', 'dtype': 'float32', 'shape': [3]}]
    }];

    const weightsNamesToFetch = ['weight0'];
    tf.loadWeights(manifest, './', weightsNamesToFetch)
        .then(weights => {
          expect((window.fetch as jasmine.Spy).calls.count()).toBe(1);

          const weightNames = Object.keys(weights);
          expect(weightNames.length).toEqual(weightsNamesToFetch.length);

          const weight0 = weights['weight0'];
          expectArraysClose(weight0, [1, 2, 3]);
          expect(weight0.shape).toEqual([3]);
          expect(weight0.dtype).toEqual('float32');
        })
        .then(done)
        .catch(done.fail);
  });

  it('1 group, 2 weights, fetch 1st weight', done => {
    setupFakeWeightFiles({'./weightfile0': new Float32Array([1, 2, 3, 4, 5])});

    const manifest: WeightsManifestConfig = [{
      'paths': ['weightfile0'],
      'weights': [
        {'name': 'weight0', 'dtype': 'float32', 'shape': [2]},
        {'name': 'weight1', 'dtype': 'float32', 'shape': [3]}
      ]
    }];

    // Load the first weight.
    tf.loadWeights(manifest, './', ['weight0'])
        .then(weights => {
          expect((window.fetch as jasmine.Spy).calls.count()).toBe(1);

          const weightNames = Object.keys(weights);
          expect(weightNames.length).toEqual(1);

          const weight0 = weights['weight0'];
          expectArraysClose(weight0, [1, 2]);
          expect(weight0.shape).toEqual([2]);
          expect(weight0.dtype).toEqual('float32');
        })
        .then(done)
        .catch(done.fail);
  });

  it('1 group, 2 weights, fetch 2nd weight', done => {
    setupFakeWeightFiles({'./weightfile0': new Float32Array([1, 2, 3, 4, 5])});

    const manifest: WeightsManifestConfig = [{
      'paths': ['weightfile0'],
      'weights': [
        {'name': 'weight0', 'dtype': 'float32', 'shape': [2]},
        {'name': 'weight1', 'dtype': 'float32', 'shape': [3]}
      ]
    }];

    // Load the second weight.
    tf.loadWeights(manifest, './', ['weight1'])
        .then(weights => {
          expect((window.fetch as jasmine.Spy).calls.count()).toBe(1);

          const weightNames = Object.keys(weights);
          expect(weightNames.length).toEqual(1);

          const weight1 = weights['weight1'];
          expectArraysClose(weight1, [3, 4, 5]);
          expect(weight1.shape).toEqual([3]);
          expect(weight1.dtype).toEqual('float32');
        })
        .then(done)
        .catch(done.fail);
  });

  it('1 group, 2 weights, fetch all weights', done => {
    setupFakeWeightFiles({'./weightfile0': new Float32Array([1, 2, 3, 4, 5])});

    const manifest: WeightsManifestConfig = [{
      'paths': ['weightfile0'],
      'weights': [
        {'name': 'weight0', 'dtype': 'float32', 'shape': [2]},
        {'name': 'weight1', 'dtype': 'float32', 'shape': [3]}
      ]
    }];

    // Load all weights.
    tf.loadWeights(manifest, './', ['weight0', 'weight1'])
        .then(weights => {
          expect((window.fetch as jasmine.Spy).calls.count()).toBe(1);

          const weightNames = Object.keys(weights);
          expect(weightNames.length).toEqual(2);

          const weight0 = weights['weight0'];
          expectArraysClose(weight0, [1, 2]);
          expect(weight0.shape).toEqual([2]);
          expect(weight0.dtype).toEqual('float32');

          const weight1 = weights['weight1'];
          expectArraysClose(weight1, [3, 4, 5]);
          expect(weight1.shape).toEqual([3]);
          expect(weight1.dtype).toEqual('float32');
        })
        .then(done)
        .catch(done.fail);
  });

  it('1 group, multiple weights, different dtypes', done => {
    const buffer = new ArrayBuffer(5 * 4);
    const intBuffer = new Int32Array(buffer, 0, 2);
    intBuffer.set([1, 2]);
    const floatBuffer = new Float32Array(buffer, intBuffer.byteLength, 3);
    floatBuffer.set([3.0, 4.0, 5.0]);

    setupFakeWeightFiles({'./weightfile0': buffer});

    const manifest: WeightsManifestConfig = [{
      'paths': ['weightfile0'],
      'weights': [
        {'name': 'weight0', 'dtype': 'int32', 'shape': [2]},
        {'name': 'weight1', 'dtype': 'float32', 'shape': [3]}
      ]
    }];

    // Load all weights.
    tf.loadWeights(manifest, './', ['weight0', 'weight1'])
        .then(weights => {
          expect((window.fetch as jasmine.Spy).calls.count()).toBe(1);

          const weightNames = Object.keys(weights);
          expect(weightNames.length).toEqual(2);

          const weight0 = weights['weight0'];
          expectArraysClose(weight0, [1, 2]);
          expect(weight0.shape).toEqual([2]);
          expect(weight0.dtype).toEqual('int32');

          const weight1 = weights['weight1'];
          expectArraysClose(weight1, [3, 4, 5]);
          expect(weight1.shape).toEqual([3]);
          expect(weight1.dtype).toEqual('float32');
        })
        .then(done)
        .catch(done.fail);
  });

  it('1 group, sharded 1 weight across multiple files', done => {
    const shard0 = new Float32Array([1, 2, 3, 4, 5]);
    const shard1 = new Float32Array([1.1, 2.2]);
    const shard2 = new Float32Array([10, 20, 30]);

    setupFakeWeightFiles({
      './weightfile0': shard0,
      './weightsfile1': shard1,
      './weightsfile2': shard2
    });

    const manifest: WeightsManifestConfig = [{
      'paths': ['weightfile0', 'weightsfile1', 'weightsfile2'],
      'weights': [{'name': 'weight0', 'dtype': 'float32', 'shape': [5, 2]}]
    }];

    tf.loadWeights(manifest, './', ['weight0'])
        .then(weights => {
          expect((window.fetch as jasmine.Spy).calls.count()).toBe(3);

          const weightNames = Object.keys(weights);
          expect(weightNames.length).toEqual(1);

          const weight0 = weights['weight0'];
          expectArraysClose(weight0, [1, 2, 3, 4, 5, 1.1, 2.2, 10, 20, 30]);
          expect(weight0.shape).toEqual([5, 2]);
          expect(weight0.dtype).toEqual('float32');
        })
        .then(done)
        .catch(done.fail);
  });

  it('1 group, sharded 2 weights across multiple files', done => {
    const shard0 = new Int32Array([1, 2, 3, 4, 5]);

    // shard1 contains part of the first weight and part of the second.
    const shard1 = new ArrayBuffer(5 * 4);
    const intBuffer = new Int32Array(shard1, 0, 2);
    intBuffer.set([10, 20]);
    const floatBuffer = new Float32Array(shard1, intBuffer.byteLength, 3);
    floatBuffer.set([3.0, 4.0, 5.0]);

    const shard2 = new Float32Array([10, 20, 30]);

    setupFakeWeightFiles({
      './weightfile0': shard0,
      './weightsfile1': shard1,
      './weightsfile2': shard2
    });

    const manifest: WeightsManifestConfig = [{
      'paths': ['weightfile0', 'weightsfile1', 'weightsfile2'],
      'weights': [
        {'name': 'weight0', 'dtype': 'int32', 'shape': [7, 1]},
        {'name': 'weight1', 'dtype': 'float32', 'shape': [3, 2]}
      ]
    }];

    tf.loadWeights(manifest, './', ['weight0', 'weight1'])
        .then(weights => {
          expect((window.fetch as jasmine.Spy).calls.count()).toBe(3);

          const weightNames = Object.keys(weights);
          expect(weightNames.length).toEqual(2);

          const weight0 = weights['weight0'];
          expectArraysClose(weight0, [1, 2, 3, 4, 5, 10, 20]);
          expect(weight0.shape).toEqual([7, 1]);
          expect(weight0.dtype).toEqual('int32');

          const weight1 = weights['weight1'];
          expectArraysClose(weight1, [3.0, 4.0, 5.0, 10, 20, 30]);
          expect(weight1.shape).toEqual([3, 2]);
          expect(weight1.dtype).toEqual('float32');
        })
        .then(done)
        .catch(done.fail);
  });

  it('2 group, 4 weights, fetches one group', done => {
    setupFakeWeightFiles({
      './weightfile0': new Float32Array([1, 2, 3, 4, 5]),
      './weightfile1': new Float32Array([6, 7, 8, 9])
    });

    const manifest: WeightsManifestConfig = [
      {
        'paths': ['weightfile0'],
        'weights': [
          {'name': 'weight0', 'dtype': 'float32', 'shape': [2]},
          {'name': 'weight1', 'dtype': 'float32', 'shape': [3]}
        ]
      },
      {
        'paths': ['weightfile1'],
        'weights': [
          {'name': 'weight2', 'dtype': 'float32', 'shape': [3, 1]},
          {'name': 'weight3', 'dtype': 'float32', 'shape': []}
        ]
      }
    ];

    tf.loadWeights(manifest, './', ['weight0', 'weight1'])
        .then(weights => {
          // Only the first group should be fetched.
          expect((window.fetch as jasmine.Spy).calls.count()).toBe(1);

          const weightNames = Object.keys(weights);
          expect(weightNames.length).toEqual(2);

          const weight0 = weights['weight0'];
          expectArraysClose(weight0, [1, 2]);
          expect(weight0.shape).toEqual([2]);
          expect(weight0.dtype).toEqual('float32');

          const weight1 = weights['weight1'];
          expectArraysClose(weight1, [3, 4, 5]);
          expect(weight1.shape).toEqual([3]);
          expect(weight1.dtype).toEqual('float32');
        })
        .then(done)
        .catch(done.fail);
  });

  it('2 group, 4 weights, one weight from each group', done => {
    setupFakeWeightFiles({
      './weightfile0': new Float32Array([1, 2, 3, 4, 5]),
      './weightfile1': new Float32Array([6, 7, 8, 9])
    });

    const manifest: WeightsManifestConfig = [
      {
        'paths': ['weightfile0'],
        'weights': [
          {'name': 'weight0', 'dtype': 'float32', 'shape': [2]},
          {'name': 'weight1', 'dtype': 'float32', 'shape': [3]}
        ]
      },
      {
        'paths': ['weightfile1'],
        'weights': [
          {'name': 'weight2', 'dtype': 'float32', 'shape': [3, 1]},
          {'name': 'weight3', 'dtype': 'float32', 'shape': []}
        ]
      }
    ];

    tf.loadWeights(manifest, './', ['weight0', 'weight2'])
        .then(weights => {
          // Both groups need to be fetched.
          expect((window.fetch as jasmine.Spy).calls.count()).toBe(2);

          const weightNames = Object.keys(weights);
          expect(weightNames.length).toEqual(2);

          const weight0 = weights['weight0'];
          expectArraysClose(weight0, [1, 2]);
          expect(weight0.shape).toEqual([2]);
          expect(weight0.dtype).toEqual('float32');

          const weight2 = weights['weight2'];
          expectArraysClose(weight2, [6, 7, 8]);
          expect(weight2.shape).toEqual([3, 1]);
          expect(weight2.dtype).toEqual('float32');
        })
        .then(done)
        .catch(done.fail);
  });

  it('2 group, 4 weights, dont specify weights fetchs all', done => {
    setupFakeWeightFiles({
      './weightfile0': new Float32Array([1, 2, 3, 4, 5]),
      './weightfile1': new Float32Array([6, 7, 8, 9])
    });

    const manifest: WeightsManifestConfig = [
      {
        'paths': ['weightfile0'],
        'weights': [
          {'name': 'weight0', 'dtype': 'float32', 'shape': [2]},
          {'name': 'weight1', 'dtype': 'float32', 'shape': [3]}
        ]
      },
      {
        'paths': ['weightfile1'],
        'weights': [
          {'name': 'weight2', 'dtype': 'float32', 'shape': [3, 1]},
          {'name': 'weight3', 'dtype': 'float32', 'shape': []}
        ]
      }
    ];

    // Don't pass a third argument to loadWeights to load all weights.
    tf.loadWeights(manifest, './')
        .then(weights => {
          // Both groups need to be fetched.
          expect((window.fetch as jasmine.Spy).calls.count()).toBe(2);

          const weightNames = Object.keys(weights);
          expect(weightNames.length).toEqual(4);

          const weight0 = weights['weight0'];
          expectArraysClose(weight0, [1, 2]);
          expect(weight0.shape).toEqual([2]);
          expect(weight0.dtype).toEqual('float32');

          const weight1 = weights['weight1'];
          expectArraysClose(weight1, [3, 4, 5]);
          expect(weight1.shape).toEqual([3]);
          expect(weight1.dtype).toEqual('float32');

          const weight2 = weights['weight2'];
          expectArraysClose(weight2, [6, 7, 8]);
          expect(weight2.shape).toEqual([3, 1]);
          expect(weight2.dtype).toEqual('float32');

          const weight3 = weights['weight3'];
          expectArraysClose(weight3, [9]);
          expect(weight3.shape).toEqual([]);
          expect(weight3.dtype).toEqual('float32');
        })
        .then(done)
        .catch(done.fail);
  });

  it('throws if requested weight not found', async done => {
    setupFakeWeightFiles({'./weightfile0': new Float32Array([1, 2, 3])});

    const manifest: WeightsManifestConfig = [{
      'paths': ['weightfile0'],
      'weights': [{'name': 'weight0', 'dtype': 'float32', 'shape': [3]}]
    }];

    const weightsNamesToFetch = ['doesntexist'];
    try {
      await tf.loadWeights(manifest, './', weightsNamesToFetch);
      done.fail();
    } catch (e) {
      done();
    }
  });

  it('throws if requested weight has unknown dtype', async done => {
    setupFakeWeightFiles({'./weightfile0': new Float32Array([1, 2, 3])});

    const manifest: WeightsManifestConfig = [{
      'paths': ['weightfile0'],
      'weights': [{
        'name': 'weight0',
        // tslint:disable-next-line:no-any
        'dtype': 'null' as any,
        'shape': [3]
      }]
    }];

    const weightsNamesToFetch = ['weight0'];
    try {
      await tf.loadWeights(manifest, './', weightsNamesToFetch);
      done.fail();
    } catch (e) {
      done();
    }
  });

  it('should use request option', done => {
    setupFakeWeightFiles({'./weightfile0': new Float32Array([1, 2, 3])});

    const manifest: WeightsManifestConfig = [{
      'paths': ['weightfile0'],
      'weights': [{'name': 'weight0', 'dtype': 'float32', 'shape': [3]}]
    }];

    const weightsNamesToFetch = ['weight0'];
    tf.loadWeights(
          manifest, './', weightsNamesToFetch, {credentials: 'include'})
        .then(weights => {
          expect((window.fetch as jasmine.Spy).calls.count()).toBe(1);
          expect(window.fetch).toHaveBeenCalledWith('./weightfile0', {
            credentials: 'include'
          });
        })
        .then(done)
        .catch(done.fail);
  });
});

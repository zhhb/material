(function(){
  var noop = angular.noop;

  /**
   * ************************************************
   * Tests for $$qChainAdaptor service
   * @private
   * ************************************************
   */
  describe('$$qChainAdaptor', function()
  {
    var $$q, $timeout;

    var adapt, qChain, node = {
      start : noop,
      $$id  : "338440"
    };

    beforeEach(module('ngQChain'));
    beforeEach(inject( function(_$timeout_, $$qChainAdaptor,  _$$q_, _$qChain_) {
      adapt    = $$qChainAdaptor;
      $$q      = _$$q_;
      $timeout = _$timeout_;

      // Create instance of qChain
      qChain = _$qChain_();
    }));


    it('should publish an adaptor function', function() {
      expect( angular.isFunction(adapt) ).toBe(true);
    });

    describe('should properly adapt a', function()
    {
      it('`undefined`'    , function() { expectAPI(adapt(       )); });
      it('`null`'         , function() { expectAPI(adapt( null  )); });
      it('`string`'       , function() { expectAPI(adapt( "Test" )); });
      it('`empty object`' , function() { expectAPI(adapt( {}    )); });
      it('`node`'         , function() { expectAPI(adapt( node  )); });
      it('`Function`'     , function() { expectAPI(adapt( noop  )); });
      it('`Promise`'      , function() { expectAPI(adapt( $$q.when(true) )); });
      it('`qChain`'        , function() { expectAPI(adapt( qChain )); });

      function expectAPI( proxy )
      {
        expect( angular.isFunction(proxy.id)         ).toBeTruthy();
        expect( angular.isFunction(proxy.start)      ).toBeTruthy();
        expect( angular.isFunction(proxy.onComplete) ).toBeTruthy();
        expect( angular.isFunction(proxy.children)   ).toBeTruthy();
      }
    });

    describe('id() should valid ID for a', function()
    {
      it('`undefined`'    , function() { expectID(adapt(       )); });
      it('`null`'         , function() { expectID(adapt( null  )); });
      it('`string`'       , function() { expectID(adapt( "Test")); });
      it('`empty object`' , function() { expectID(adapt( {}    )); });
      it('`Function`'     , function() { expectID(adapt( noop  )); });
      it('`node`'         , function() { expectID(adapt( node )          , true); });
      it('`Promise`'      , function() { expectID(adapt( $$q.when(true) ), true); });
      it('`qChain`'        , function() { expectID(adapt( qChain )      , true); });

      function expectID(proxy, checkNotEmpty ) {
        expect( angular.isString(proxy.id())).toBe(true);

        if ( checkNotEmpty ) {
          expect( proxy.id().length > 0 ).toBe(true);
        }
      }
    });

    describe('start() should returns Promise for a', function()
    {
      it('`undefined`'    , function() { expectPromise(adapt(       )); });
      it('`null`'         , function() { expectPromise(adapt( null  )); });
      it('`string`'       , function() { expectPromise(adapt( "Test" )); });
      it('`empty object`' , function() { expectPromise(adapt( {}    )); });
      it('`node`'         , function() { expectPromise(adapt( node  )); });
      it('`Function`'     , function() { expectPromise(adapt( noop  ));  });
      it('`Promise`'      , function() { expectPromise(adapt( $$q.when(true) )); });
      it('`qChain`'        , function() { expectPromise(adapt( qChain )); });

      function expectPromise(proxy) {
        expect( isPromiseLike( proxy.start() )).toBeTruthy();
      }

    });

    describe('start() should resolve correctly', function()
    {
      it('`undefined`'    , function() { expectResolveTo( adapt(       ), 3 ); });
      it('`null`'         , function() { expectResolveTo( adapt( null  ), 3 ); });
      it('`string`'       , function() { expectResolveTo( adapt( "Test"), 3 ); });
      it('`empty object`' , function() { expectResolveTo( adapt( {}    ), 3 ); });
      it('`Function`'     , function() { expectResolveTo( adapt( noop  ), 3 ); });
      it('`node`'         , function() { expectResolveTo( adapt( node          ), 3 ); });
      it('`Promise`'      , function() { expectResolveTo( adapt( $$q.when(true)), 3 ); });
      it('`qChain`'        , function() { expectResolveTo( adapt( qChain ), 3 ); });

      function expectResolveTo( node, value ) {
        var result;
        node.start().then(function() {
          result = value;
        });
        $timeout.flush();
        expect( result ).toBe( value );
      }
    });

  });

  /**
   * ************************************************
   * Tests for $qChain service
   * ************************************************
   */
  describe('$qChain', function() {
    var $$q, qChain, $timeout;

    beforeEach(module('ngQChain'));
    beforeEach(inject(function (_$timeout_, _$$q_) {
      $$q      = _$$q_;
      $timeout = _$timeout_;
    }));

    describe('initial configuration', function ()
    {
      beforeEach(inject(function (_$qChain_) {
        // Create instance of qChain without custom adaptor
        qChain = _$qChain_();
      }));

      it('should work without a custom adaptor factory', inject(function ($qChain) {
        expect(isQChainLink($qChain())).toBe(true);
      }));

      it('sequence() should return `self`', function () {
        expect(qChain.sequence() === qChain).toBe(true);
      });

      it('parallel() should return `self`', function () {
        expect(qChain.parallel() === qChain).toBe(true);
      });

      it('sequence() should return `self`', function () {
        expect(qChain.tree() === qChain).toBe(true);
      });

      it('start() should return a promise', function () {
        expect(isPromiseLike(qChain.start())).toBe(true);
      });

      it('should publish an unresolved promise before start()', function () {
        expect(isPromiseLike(qChain.promise)).toBe(true);

        var started;
        qChain.promise.then(function () {
          started = true;
        });

        expect(started).toBeUndefined();
      });

      it('should publish a resolved promise after start()', function () {
        var started;

        qChain.start();

        qChain.promise.then(function () {
          started = true;
        });
        $timeout.flush();

        expect(started).toBe(true);
      });

      it('start() should return a resolved promise', function () {
        var result;

        qChain.start().then(function (response) {
          result = response;
        });
        $timeout.flush();

        expect(result).toBe(true);

        qChain.promise.then(function () {
          result = "resolved";
        });
        $timeout.flush();

        expect(result).toEqual('resolved');
      });

    });

    describe('building sequences', function ()
    {
      beforeEach(inject(function (_$qChain_) {
        // Create instance of qChain without custom adaptor
        qChain = _$qChain_();
      }));

      describe('before start()', function () {

        it("should be pending with sequence( string )", function () {
          var result = 0;

          makeSequence("Testing", function () {
            result += 13;
          });

          expect(result).toBe(0);
        });

        it("should be pending with sequence( [ ] )", function () {
          var result = 0;

          makeSequence([ ], function () {
            result += 7;
          });

          expect(result).toBe(0);
        });

        it("should be pending with sequence( promise )", function () {
          var dfd = $$q.defer(),
            result = 0;

          makeSequence(dfd.promise, function () {
            result += 1;
          });

          expect(result).toBe(0);
        });

        it('should be pending with sequence( Function )', function () {
          var result = 0,
            increment = function () {
              result += 1;
            };

          makeSequence(increment, increment);
          expect(result).toBe(0);
        });

        it('should be pending with sequence( Object )', function () {
          var result = 0,
            node = {
              start: function () {
                result += 2;
              }
            };

          makeSequence(node, function () {
            result += 1;
          });

          expect(result).toBe(0);
        });

        it('should be pending with sequence( qChain )', inject(function ($qChain) {
          var result = 0;

          makeSequence($qChain(), function () {
            result += 5;
          });

          expect(result).toBe(0);
        }));

      });

      describe('after start()', function () {

        it("should resolve a sequence( undefined )", inject(function($qChain) {
          var result = 0;

          $qChain().sequence()
            .start().then(function () {
              result += 13;
            });

          $timeout.flush();
          expect(result).toBe(13);
        }));

        it("should resolve a sequence( string )", function () {
          var result = 0;

          makeSequence("Testing", function () {
            result += 13;
          }).start();

          $timeout.flush();
          expect(result).toBe(13);

        });

        it("should be pending with sequence( [ ] )", function () {
          var result = 0;

          makeSequence([], function () {
            result += 7;
          }).start();

          $timeout.flush();
          expect(result).toBe(7);
        });


        it("should resolve a sequence( promise )", function () {
          var dfd = $$q.defer();
          dfd.resolve(true);

          var result = 0;

          makeSequence(dfd.promise, function () {
            result += 1;
          }).start();

          $timeout.flush();
          expect(result).toBe(1);
        });

        it("should not resolve a sequence( unresolved promise )", function () {
          var dfd = $$q.defer();
          var result = 0;

          makeSequence(dfd.promise, function () {
            result += 13;
          }).start();

          $timeout.flush();
          expect(result).toBe(0);
        });

        it('should resolve a sequence( Function )', function () {
          var result = 0,
            increment = function () {
              result += 1;
            };

          makeSequence(increment, increment).start();
          $timeout.flush();

          expect(result).toBe(2);
        });

        it('should not resolve a sequence( Function() -> unresolved Promise )', function () {
          var result = 0,
            makePromise = function () {
              var dfd = $$q.defer();
              var promise = dfd.promise.then(function () {
                result += 15;
              });

              return promise;
            };

          makeSequence(makePromise).start();
          $timeout.flush();

          expect(result).toBe(0);
        });

        it('should resolve a sequence( Function() -> resolved Promise )', function () {
          var result = 0,
            makePromise = function () {
              var dfd = $$q.defer();
              var promise = dfd.promise.then(function () {
                result += 15;
              });

              dfd.resolve(true);

              return promise;
            };

          makeSequence(makePromise).start();
          $timeout.flush();

          expect(result).toBe(15);
        });

        it('should resolve a sequence( Object, Object )', function () {
          var result = 0,
            node1 = { start: function () { result += 2; } },
            node2 = { start: function () { result += 3; } };

          makeSequence(node1, node2, function () {
            result += 1;
          }).start();

          $timeout.flush();
          expect(result).toBe(6);
        });

        it('should resolve a sequence( qChain )', inject(function ($qChain) {
          var result = 0;

          makeSequence($qChain(), function () {
            result += 5;
          }).start();

          $timeout.flush();

          expect(result).toBe(5);
        }));

        it('should resolve complex sequence(object, function, qChain)', inject(function($qChain) {

          var result=0,
            node = {
              start : function()
              {
                return $$q.when(result);
              }
            };

          $qChain().sequence(
            node,
            function() { return $timeout(function () {  return result += 3; }) },
            $qChain().sequence( node )
          )
            .start()
            .then(function() {
              result += 1;
            });

          $timeout.flush();
          expect( result ).toBe( 4 );
        }));

      });

    });

    describe('building parallels', function ()
    {
      beforeEach(inject(function (_$qChain_) {
        // Create instance of qChain without custom adaptor
        qChain = _$qChain_();
      }));

      describe('before start()', function () {

        it("should be pending with parallel( string )", function () {
          var result = 0;

          makeParallel( "Node1", "Node2", function () {
            result += 13;
          });

          expect(result).toBe(0);
        });

        it("should be pending with parallel( [ ] )", function () {
          var result = 0;

          makeParallel( [ ], function () {
            result += 7;
          });

          expect(result).toBe(0);
        });


        it("should be pending with parallel( promise )", function () {
          var dfd = $$q.defer(),
            result = 0;

          makeParallel( dfd.promise, $$q.when(true), function () {
            result += 1;
          });

          expect(result).toBe(0);
        });

        it('should be pending with parallel( Function )', function () {
          var result = 0,
            increment = function () {
              result += 1;
            };

          makeParallel( increment, increment, increment);
          expect(result).toBe(0);
        });

        it('should be pending with parallel( Object )', function () {
          var result = 0,
            node = {
              start: function () {
                result += 2;
              }
            };

          makeParallel( node, node, node, function () {
            result += 1;
          });

          expect(result).toBe(0);
        });

        it('should be pending with parallel( qChain )', inject(function ($qChain) {
          var result = 0;

          makeParallel( $qChain(), $$q.when(true), function () {
            result += 5;
          });

          expect(result).toBe(0);
        }));

      });

      describe('after start()', function () {

        it("should resolve a parallel( undefined )", inject(function($qChain) {
          var result = 0;

          $qChain().parallel()
            .start().then(function () {
              result += 13;
            });

          $timeout.flush();
          expect(result).toBe(13);
        }));

        it("should resolve a parallel( string, string )", function () {
          var result = 0;

          makeParallel( "Node1", "Node2", function () {
            result += 13;
          }).start();

          $timeout.flush();
          expect(result).toBe(13);
        });

        it("should be pending with parallel( [ ] )", function () {
          var result = 0;

          makeParallel( [ ], function () {
            result += 7;
          }).start();

          $timeout.flush();

          expect(result).toBe(7);
        });


        it("should resolve a parallel( promise, promise )", function () {
          var dfd = $$q.defer(),
            result = 0;

          makeParallel( dfd.promise, $$q.when(true), function () {
            result += 1;
          }).start();

          dfd.resolve(true);
          $timeout.flush();

          expect(result).toBe(1);
        });

        it("should not resolve a parallel( unresolved promise, promise )", function () {
          var dfd = $$q.defer(),
            result = 0;

          makeParallel( dfd.promise, $$q.when(true), function () {
            result += 1;
          }).start();

          $timeout.flush();
          expect(result).toBe(0);
        });

        it('should resolve a parallel( Function, Function, Function )', function () {
          var result = 0,
            increment = function () {
              result += 1;
            };

          makeParallel( increment, increment, increment).start();
          $timeout.flush();

          expect(result).toBe(3);
        });

        it('should not resolve a parallel( Function() -> unresolved Promise, promise )', function () {
          var result = 0,
            makePromise = function () {
              var dfd = $$q.defer();
              var promise = dfd.promise.then(function () {
                result += 15;
              });
              return promise;
            },
            makeResolved = function() {
              return $$q.when(true);
            };

          makeParallel( makePromise, makeResolved ).start();
          $timeout.flush();

          expect(result).toBe(0);
        });

        it('should resolve a parallel( Function() -> resolved Promise )', function () {
          var result = 0,
            makePromise = function () {
              var dfd = $$q.defer();
              var promise = dfd.promise.then(function () {
                result += 15;
              });

              dfd.resolve(true);

              return promise;
            },
            makeResolved = function() {
              return $$q.when(true)
                .then(function(){
                  result +=5;
                });
            };

          makeParallel( makeResolved,  makePromise).start();
          $timeout.flush();

          expect(result).toBe(20);
        });

        it('should resolve a parallel( Object, Object )', function () {
          var result = 0,
            node1 = { start: function () {  result += 2;  } },
            node2 = { start: function () {  result += 6;  } };

          makeParallel( node1, node2, function () {
            result += 3;
          }).start();

          $timeout.flush();
          expect(result).toBe(11);
        });

        it('should resolve a parallel( qChain, qChain )', inject(function ($qChain) {
          var result = 0,
            qt1 = $qChain(),
            qt2 = $qChain().parallel($$q.when(true));

          qt2.promise
            .then( function() {
              result += 23;
            });


          makeParallel( qt1, qt2, function () {
            result += 5;
          }).start();

          $timeout.flush();

          expect(result).toBe(28);
        }));

      });
    });

    describe('notifications', function ()
    {
      var $qChain;

      beforeEach(inject(function (_$qChain_) {
        $qChain = _$qChain_;
      }));

      it('should trigger onComplete callback for simple sequence', function() {

        var  result=0,
          node = {
            onComplete : function() { result += 9;             },
            start      : function() { return $$q.when(result); }
          };

        $qChain().sequence( node, node ).start();

        $timeout.flush();
        expect( result ).toBe( 18 );
      });

      it('should trigger onComplete callback for simple parallel', function() {

        var result1 = 0,
          result2 = 0,
          node1 = {
            onComplete : function() { result1 += 9;             },
            start      : function() { return $$q.when(result1); }
          },
          node2 = {
            onComplete : function() { result2 += 9;             },
            start      : function() { return $$q.when(result2); }
          };

        $qChain().parallel( node1, node2 ).start();
        $timeout.flush();

        expect( result1 + result2 ).toBe( 18 );
      });


      it('should trigger onComplete callback for complex sequences', function() {

        var  result=0,
          node = {
            onComplete : function() { result += 9;             },
            start      : function() { return $$q.when(result); }
          };

        $qChain().sequence(
          node,
          $qChain().sequence(node)
        )
          .start()
          .then(function() {
            result += 1;
          });

        $timeout.flush();
        expect( result ).toBe( 19 );
      });

    });

    describe('rejections', function() {
      var $qChain, $$q;

      beforeEach(inject(function (_$qChain_, _$$q_) {
        $qChain = _$qChain_;
        $$q = _$$q_;
      }));

      it('will abort a simple sequence',function(){
        var dfd = $$q.defer(),
            started = 0, onStart = function() {
              started +=1;
              return dfd.promise;
            },
            completed = 0,  onCompleted = function() {
              completed += 1;
            },
            aborted = 0,  onAborted = function() {
              aborted += 1;
            };

        $qChain().sequence({
          start      : onStart,
          onComplete : onCompleted
        })
        .start()
        .then( onCompleted, onAborted )

        dfd.reject("aborted");
        $timeout.flush();

        expect( started  ).toBe(1);
        expect( completed ).toBe(0);

      });

      it('will abort a sequence chain',function(){
        var dfd = $$q.defer(),
          started   = 0, onStart     = function() { started +=1; },
          completed = 0, onCompleted = function() { completed += 1; },
          aborted   = 0, onAborted   = function() { aborted += 1; };

        $qChain().sequence(
          {
            start      : function()
            {
              onStart();
              return $$q.when(true);
            },
            onComplete : onCompleted
          },
          {
            start      : function()
            {
              onStart();
              return $$q.reject("abort")
            },
            onComplete : onCompleted
          }
        )
        .start()
        .then( onCompleted, onAborted )

        dfd.reject("aborted");
        $timeout.flush();

        expect( started   ).toBe(2);
        expect( completed ).toBe(1);
        expect( aborted   ).toBe(1);

      });

      it('will abort a simple parallel',function(){
        var dfd = $$q.defer(),
          started = 0,
          completed = 0,  onCompleted = function() {
            completed += 1;
          },
          aborted = 0,  onAborted = function() {
            aborted += 1;
          };

        $qChain().parallel(
          {
            start      : function()
            {
              started +=1;
              return dfd.promise;
            },
            onComplete : onCompleted
          }
        )
        .start()
        .then( onCompleted, onAborted )

        dfd.reject("aborted");
        $timeout.flush();

        expect( started  ).toBe(1);
        expect( completed ).toBe(0);

      });

      it('will abort a parallel chain',function(){
        var dfd = $$q.defer(),
          started   = 0, onStart     = function() { started +=1; },
          completed = 0, onCompleted = function() { completed += 1; },
          aborted   = 0, onAborted   = function() { aborted += 1; };

        $qChain().parallel(
          {
            start      : function()
            {
              onStart();
              return $$q.when(true);
            },
            onComplete : onCompleted
          },
          {
            start      : function()
            {
              onStart();
              return $$q.reject("abort")
            },
            onComplete : onCompleted
          }
        )
        .start()
        .then( onCompleted, onAborted )

        dfd.reject("aborted");
        $timeout.flush();

        expect( started   ).toBe(2);
        expect( completed ).toBe(1);
        expect( aborted   ).toBe(1);

      });

      it('will abort a complex parallel chain',inject(function($$q){
        var dfd = $$q.defer(),
          started   = 0, onStart     = function() { started +=1; },
          completed = 0, onCompleted = function() { completed += 1; },
          aborted   = 0, onAborted   = function() { aborted += 1;},
          nodeGood  = {
            start      : function() { onStart(); return $$q.when(true); },
            onComplete : onCompleted
          },
          nodeBad = {
            start      : function() { onStart(); return $$q.reject("abort"); },
            onComplete : onCompleted
          },
          timeOutGood = function() {
            onStart();
            return $timeout(function(){
              return $$q.when("done");
            });
          },
          timeOutBad = function() {
            onStart();
            return $timeout(function(){
              throw new Error("aborted")
            });
          };

        $qChain().parallel(
          nodeGood,
          timeOutGood,
          $qChain().sequence(
            $$q.when(true),
            timeOutGood,
            nodeBad
          ),
          $$q.when(true)
        )
        .start()
        .then( onCompleted, onAborted )

        dfd.reject("aborted");
        $timeout.flush();

        expect( started   ).toBe(4);
        expect( completed ).toBe(1);
        expect( aborted   ).toBe(1);

      }));

    });

    describe('building trees', function ()
    {
      var $qChain, $timeout;

      beforeEach(inject(function (_$qChain_, _$timeout_) {
        // Create instance of qChain without custom adaptor
        $timeout = _$timeout_;
        $qChain = _$qChain_;
        qChain = _$qChain_();
      }));

      describe('after start()', function () {

        it("should resolve a sequence with nested parallels", function () {
          var result = 0,
            onComplete = function () {
              result += 13;
            };

          makeSequence(
            $timeout(onComplete),
            $$q.when(true).then(onComplete),
            makeParallel(
              $timeout(onComplete),
              $$q.when(true),
              function() { return $timeout(onComplete); },
              onComplete, $qChain()    // for unique parallel instance
            ),
            $timeout(onComplete),
            onComplete, $qChain()      // for unique sequence instance
          ).start();

          $timeout.flush();
          expect(result).toBe( 7 * 13 );
        });

        it("should resolve a sequence with complex nested parallels", function() {
          var result = 0,
            onComplete = function () {
              result += 13;
            };

          var timeline = $qChain().sequence(          // for unique sequence instance
            $timeout(onComplete),
            $$q.when(true).then(onComplete),
            $qChain().parallel(                   // for unique parallel instance
              $timeout(onComplete),
              $$q.when(true),
              function() { return $timeout(onComplete); }
            ),
            $timeout(onComplete)
          );

          timeline.promise.then(onComplete);
          timeline.start();

          $timeout.flush();

          expect(result).toBe( 6 * 13 );
        });

        it("should resolve a parallel with nested sequences", function () {
          var result = 0,
            onComplete = function () {
              result += 9;
            };

          makeParallel(
            $timeout(onComplete),
            makeSequence(
              $$q.when(true).then(onComplete),
              $timeout(onComplete),
              $$q.when(true),
              function() { return $timeout(onComplete); },
              onComplete, $qChain()    // for unique parallel instance
            ),
            $timeout(onComplete),
            onComplete, $qChain()      // for unique sequence instance
          ).start();

          $timeout.flush();
          expect(result).toBe( 7 * 9 );
        });



      });
    });


    // ****************************
    // Macro functions for it()s
    // ****************************

    function makeSequence() {
      return buildChain( toArray(arguments), "sequence" );
    }

    function makeParallel() {
      return buildChain( toArray(arguments), "parallel" );
    }

    function buildChain(items, method)
    {
      var tree = qChain,
          handler = items.pop();

      // Check the last 1-2 args for a qChain instance and a handler
      if ( isQChainLink(handler) ) {
        tree = handler;
        handler = items.pop();
      }

      tree[method](items)
        .promise
        .then(handler || angular.noop);

      return tree;
    }

  });


  // ****************************
  // Internal utility methods
  // ****************************

  function isPromiseLike(target) {
    return target && angular.isFunction(target.then);
  }

  function isQChainLink(target) {
    return target &&
      angular.isFunction(target.parallel) &&
      angular.isFunction(target.sequence) &&
      angular.isFunction(target.start);
  }

  function toArray(args) {
    return  !angular.isObject(args) ? [ ] :
      !angular.isArray(args)  ? Array.prototype.slice.call(args, 0) : args;
  }

})();


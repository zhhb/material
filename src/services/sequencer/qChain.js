(function(){

  angular.module( 'ngQChain', ['ng'])

  /**
   *
   * @ngdoc service
   * @name $QChain
   * @module material.services.qChain
   *
   * @description
   * $qChain is a digest-independent, processor used for building and processing sophisticated
   * trees of promise chains. A chain is composed of 1..n segments; where each segment is a node
   * that can be linked and executed in sequence or parallel.
   *
   * Since each segment could actually represent a nested chain... we consider the entire chain
   * composition as a *promise-tree* topology. qChain provides support for complex compositions
   * and nestings of promise chains.
   *
   * Each node (aka segment) can be an instance of any of the following:
   *
   * - Object with a `start()` function
   * - a Promise
   * - a Function that returns a Promise
   * - a qChain instance
   *
   * None of the segments of a QChain will be fired until all preceding segments have resolved. The only
   * default requirement is that each node must either be a promise instance or result in a promise instance:
   *
   * - If the node is an object instance with a `start()` function will be automatically trigger.
   * - If the node is a Function, that function will be triggered
   * - If the node is a QChain instance, its start() function will be called
   *
   * For custom node instances, users can provide their own custom node adaptor.
   *
   * @usage
   * <hljs lang="javascript">
   *
   *  $qChain()
   *    .sequence(
   *
   *        slideInActivityBar,
   *        saveUserData,
   *        $qChain().parallel(
   *            fadeBackground,
   *            slideInSummary,
   *            saveAppSettings,
   *        ),
   *        notifyFaceBook,
   *        slideOutActivityBar
   *    )
   *    .start()
   *    .then( onCompleted, onAborted );
   *
   * </hljs>
   *
   */
    .service( "$qChain", ['$$qChainAdaptor', '$$q', '$log', function( $$qChainAdaptor, $$q, $log )
    {
      return function makeInstanceWith( adaptor )
      {
        return (function QChain(proxify)
        {
          var root = $$q.defer(),
            self = {
              start   : makeStart,
              sequence: makeSequence,
              parallel: makeParallel,
              tree    : makeTreeSequence
            };

          // Intercept method calls to build a sequence chain of pending function calls.

          angular.forEach( self, function( fn, method )
          {
            self[method] = function() {
              var args = toArray(arguments),
                promise  = self.promise;

              // Each method call is queued in a chain...
              promise = promise.then( function()
              {
                try {
                  // Fire the delayed method call ONLY when the previous calls/operations
                  // (in the chain segments) resolve.

                  var response = fn.apply(self, args);

                  if ( angular.isFunction(response) ) {
                    response = $$q.when(true).then( response );
                  }

                  return response;

                } catch( e ) {
                  var message = "Error calling " + method + "() - " + e.message;

                  // force rejection and skips of subsequent chain segments
                  throw new Error(message);
                }
              });

              // Append the promise segment onto the tail of the chain...
              self.promise = promise;

              if ( method == 'start') {
                root.resolve(true);
              }

              // !! `Start()` always is terminal & returns the promise chain tail
              return (method == 'start') ? promise : self;
            };
          });

          self.promise = root.promise;


          // Return self reference for method chaining...
          return self;

          // **********************************************************
          // Private Methods
          // **********************************************************

          /**
           * Start a promise chain by resolving the first/root deferred...
           * @param node
           * @returns {*}
           */
          function makeStart(node)
          {
            return node ? makeSequence(node)(node) : $$q.when( true );
          }


          /**
           * Create a resolve handler function for the specified nodes; but NOT their children
           * @returns {Function}
           */
          function makeSequence(target)
          {
            if ( arguments.length > 1 ) {
              // If multiple targets are not passed as
              // an array argument

              target = extractList(arguments);
            }

            return  !target                 ? valueFn :
              angular.isArray(target) ? iterateList(target) : makeNode(target);
          }

          /**
           * For the specified node or set of nodes, run
           * @param target  Object[] 1..n Object to run in parallel
           * @param descend Boolean Descend each node.children
           * @returns {Function}
           */
          function makeParallel( target )
          {
            if ( arguments.length > 1 ) {
              // If multiple targets are not passed as
              // an array argument

              target = extractList(arguments);
            }

            return  angular.isArray(target) ? groupList(target, false ) : makeNode(target);
          }

          /**
           * Build a promise chain of the full-tree (depth first).
           * Create a resolve handler function for the specified node(s) AND fully sequence all their children
           *
           * @param target
           * @returns {passAlong}
           */
          function makeTreeSequence(target)
          {
            if ( arguments.length > 1 ) {
              // If multiple targets are not passed as
              // an array argument

              target = extractList(arguments);
            }

            return  !target                 ? valueFn :
              angular.isArray(target) ? iterateList(target, true) : makeNode(target, true);
          }

          /**
           * Prepare a chain for the entire element and its immediate children
           * @returns Promise chain handler to start a `branched` promise chain...
           */
          function iterateList(list, descend)
          {
            return function (value)
            {
              var makeChainFn = descend ? makeTreeSequence : makeSequence,
                start       = $$q.when(true).then( makePassAlongFn( value ) );

              // Chain all nodes together in a sequence
              return reduce(list, function (promise, it)
              {
                return promise.then(  makeChainFn(it) );

              }, start);
            };
          }

          /**
           * Prepare a set of promises for the current list... each promise resolution is
           * gathered and aggregated
           *
           * NOTE: that any children groups are created as sequence chaines
           * @param list
           * @returns {Function}
           */
          function groupList(list, descend )
          {
            /**
             * Iterate all items in the list and create a list of promises
             * then use $$q.all() to group them as they run in parallel.
             * If an item is a promise-generating function [response from intermediate
             * parallel() or sequence() calls], then use that function directly.
             */
            return function createForSegment(value)
            {
              var buildSequenceFn = descend ? makeTreeSequence : makeSequence;

              return $$q.all( map(list, function (node)
              {
                var result = buildSequenceFn(node)();
                return result;
              }));
            }
          }


          /**
           * Build a promise handler that actually fires another promise to wait...
           * @param node
           * @returns {Function}
           */
          function makeNode(node, descend)
          {
            return function ()
            {
              return performAction( node ).then(
                makeDescendFn(descend, node)
              );
            };
          }


          /**
           * Perform an promise-generating asynchronous action
           *
           * @param node
           * @returns {promise|*}
           */
          function performAction(node)
          {
            var dfd = $$q.defer(),
              proxy = proxify(node);

            if ( !proxy.start ) {
              // If a `start` function is not defined. Generate a $log error and then resolve the node

              $log.error("performAction( ) >> `start()` function was not found on Node " + proxy.id() + "!");
              dfd.resolve(node);

            } else {
              try {
                // Trigger the `start` function of the node; which should generate a promise.

                proxy.start()
                  .then( proxy.onComplete || angular.noop )
                  .then(
                  function onResolve() {
                    dfd.resolve(node);
                  },
                  function onReject(fault) {
                    dfd.reject({node: node, fault:fault});
                  }
                );

              } catch(e) {

                dfd.reject(e);
              }
            }

            return dfd.promise;
          }


          // **********************************************************
          // Internal Partial Applications
          // **********************************************************


          function makeDescendFn(descend, node)
          {
            var proxy = proxify(node);

            return function descendBranch(total)
            {
              var children = proxy.children();

              if ( descend && angular.isUndefined(children) ) {
                $log.warn("Unable to descend node " + proxy.id());
              }
              return descend ? makeTreeSequence(children)(total) : $$q.when(total);
            }
          }

          function makePassAlongFn(value)
          {
            return function()
            {
              return value;
            };
          }

          /**
           * Same as unpublished feature in AngularJS
           * @param val
           * @returns {*}
           */
          function valueFn(val) {
            return val;
          }

        })(adaptor || $$qChainAdaptor);
      };


      /**
       * Build a list from an arguments map, if the only element is an array
       * then flatten the result set.
       *
       * @param args
       * @returns {*} Array
       */
      function extractList(map) {
        var args = toArray(map);
        if ( (args.length == 1) && angular.isArray(args[0]) ){
          args = args[0];
        }
        return args;
      }


      /**
       * Convert `arguments` hashmap to formal Array instance
       * @param target
       * @returns {*}
       */
      function toArray(args) {
        return  !angular.isObject(args) ? [ ] :
          !angular.isArray(args)  ? Array.prototype.slice.call(args, 0) : args;
      }

      // ************************************
      // Polyfills for Array functionals
      // ************************************


      function map(list, iteratee) {
        var j = -1, len = list.length,
          result = Array(len);

        while (++j < len) {
          result[j] = iteratee(list[j], j, list);
        }
        return result;
      }


      function reduce( list, iteratorFn, seed ) {
        var j = -1, len = list.length;

        while (++j < len) {
          seed = iteratorFn(seed, list[j], j, list);
        }
        return seed;
      }
    }])

  /**
   * This service publish a function that will adapt a incoming element to be used as a
   * node within the the qChain processing
   *
   * @returns Function to adapt() target elements as nodes in a qChain
   */
    .service( "$$qChainAdaptor", ['$$q', '$log', function( $$q, $log )
    {
      var counter = 0;

      /**
       * Convert the node, if needed, to an object with a promise-returning `start()` method.
       * This conversion allows each node of a QChain model to be a $animateQueue, QChain,
       * Function, or even a Promise.
       *
       * @param target
       * @retuns {object}
       */
      return function makeAdaptor(target)
      {
        var self;

        return self = {
          start : function()
          {
            // must return a Promise
            return  isPromiseLike(target)       ? target               :
              isQChainLink(target)         ? target.start()       :
                angular.isFunction(target)  ? $$q.when( target() ) :
                  $$q.when( isNodeLike(target) ? target.start() : target);
          },

          children : function()
          {
            return angular.isObject(target) ? (target["nodes"] || target["children"]) : undefined;
          },

          id : function()
          {
            if ( isPromiseLike(target) || isQChainLink(target) || isNodeLike(target)){
              if ( !target["$$id"] ) {
                target["$$id"] = "target_" + counter++;
              }
              return target["$$id"];
            }
            return "";
          },

          onComplete : function(result) {
            // When each target resolves, deliver notification via `onComplete` callbacks
            $log.debug("Resolved target( " + self.id() + " )" );

            return target ? (target.onComplete || angular.noop)(target, result) : false;
          }
        };
      };

      /**
       * Is the target an instance of QChain; generated via calls to
       * `$$qChain().parallel()` or `$$qChain().sequence()`;
       *
       * @param target Object
       * @returns {boolean} True if instance of QChain
       */
      function isQChainLink(target) {
        return target &&
          angular.isFunction(target.parallel) &&
          angular.isFunction(target.sequence) &&
          angular.isFunction(target.start);
      }

      /**
       * Copied from Angular.js
       */
      function isPromiseLike(target) {
        return target && angular.isFunction(target.then);
      }

      function isNodeLike(target) {
        return target && angular.isFunction(target.start);
      }

    }]);



})();

(function()
{
    angular.module('ngAnimateSequence', ['ngAnimate', 'ngQChain'])

        /**
         * $$animateDriver is the default, internal animation driver
         * used by $animateQueue. This driver provides a promised-based
         * wrapper around the popular methods available in $animate.
         *
         * NOTE: The wrapper creates head hooks to the `real` $animate methods
         */
        .factory('$$animateDriver', ['$q', '$animate', '$rootScope',

            function ($q, $animate, $rootScope)
            {
                // Constructor function to be used by $animateQueue
                return function buildDriver()
                {
                    var driver, operations = [ ];

                    return driver = addDelegates({
                        initialize : angular.noop,
                        start : function (completionFn)
                        {
                            return buildSequence().then(
                               completionFn || angular.noop
                            );
                        }
                    },'enter leave move addClass removeClass setClass');


                    /**
                     * Decorate specified object with methods that will
                     * cache requests until driver.start() is called.
                     *
                     * @param driver proxy animation object with interceptor methods
                     * @param methods Space-delimited String of proxy $animate methods to create
                     */
                    function addDelegates( driver, methods ) {

                        angular.forEach(methods.split(' '), function (method)
                        {
                            driver[method] = function ()
                            {
                                var args = arguments;
                                operations.push(function ()
                                {
                                    return $animate[method].apply($animate, args);
                                });
                            };
                        });

                        return driver;
                    }


                    /**
                     * Self-feeding promise chain that sequential triggers each
                     * pending operation.
                     *
                     * @returns {*} Promise
                     */
                    function buildSequence()
                    {
                        // Chain all operation calls together into a promise sequence
                        return operations.reduce(function (promise, fn)
                        {
                            return promise.then( function() {
                                return fn().then( function(result)
                                {
                                    // Force digest() updates after each operation
                                    !$rootScope.$$phase && $rootScope.$digest();

                                    return result;
                                });
                            });
                        }, $q.when(true));
                    }

                };
            }
        ])

        /**
         * $animateQueue publishes a promise-based, interceptor wrapper around
         * for the animation driver (default is $$animateDriver). The queue allows
         * a sequence of operations to be prepared and applied to 1 or more target elements.
         *
         * ```js
         *
         *   // Animate target elements to transition through a series
         *   // of colors. NOTE: the transition duration is defined in CSS
         *
         *   var colorSweep = $animateQueue()
         *         .addClass('red', { 'transform':'scale(2)' })
         *         .addClass('blue')
         *         .addClass('yellow')
         *         .removeClass('yellow')
         *         .removeClass('blue')
         *         .removeClass('red');
         *
         *   var viewPort = element.find('section')[0];
         *
         *   colorSweep( viewPort )
         *     .start()
         *     .then(function(){
         *       // Full color sweep has finished;
         *     });
         *
         * ```
         */
        .factory( '$animateQueue', [ '$q', '$$animateDriver',
            function ($q, $$animateDriver)
            {
                /**
                 * Build the animation Driver used
                 * @param driverFactory
                 * @returns {animate}
                 */
                return function(driverFactory)
                {
                    var queue  = Queue;
                    var driver = driverFactory ? driverFactory() : $$animateDriver();

                    return extend(queue, driver, "initialize start");

                    /**
                     * Build simple `start` processor that triggers
                     * each operation and then starts the registered
                     * animation engine (driver).
                     *
                     * @
                     * @returns {{start: start}}
                     */
                    function Queue(target, overrides)
                    {
                        var defer = $q.defer();

                        return {
                            start: function ()
                            {
                                (driver.initialize || angular.noop)(arguments);

                                // Run each of the step methods (operations) and include the
                                // start() parameters (which are typically `elements`)

                                for (var i = 0; i < queue.operations.length; i++) {
                                    queue.operations[i](target, overrides);
                                }

                                driver.start( completionFn )
                                      .catch( failureFn );

                                // start() methods always return Promise instances
                                return defer.promise;


                                /**
                                 * The queue animation sequence has finished or failed
                                 * resolve the our promise for external notifications.
                                 *
                                 * @param failed
                                 */
                                function completionFn(failed) {
                                    failed ? defer.reject() : defer.resolve();
                                }

                                /**
                                 * The queue animation has failed... let's reject our promise
                                 * @param fault
                                 */
                                function failureFn(fault) {
                                    defer.reject(fault);
                                }
                            }
                        };
                    }
                };

                /**
                 * Create proxy methods that
                 * @param target
                 * @param driver
                 * @returns {Array}
                 */
                function extend(target, driver, exclude)
                {
                    target.operations = [];

                    var excluded = (exclude || "").split(" ");
                    var isExcluded = function (method)
                        {
                            return (excluded.indexOf(method) > -1);
                        };

                    angular.forEach(driver, function (fn, method)
                    {
                        if (angular.isFunction(fn) && !isExcluded(method)) {

                            // Build method interceptor

                            target[method] = function ()
                            {
                                var definitionArgs = arguments;

                                // Cache the method call as a pending operation

                                target.operations.push( function()
                                {
                                    var startArgs = arguments;
                                    var args = substituteOptions(definitionArgs, startArgs);
                                    return fn.apply(driver, args);
                                });

                                // Allow method chaining...
                                return target;
                            }
                        }
                    });

                    return target;
                }

                /**
                 * Substitute
                 */
                function substituteOptions(params, elements) {
                    elements = toArray(elements);

                    var target = elements[0];
                    var overrides = elements[1];

                    var args = [];
                    var isTokenized = false;

                    angular.forEach(params, function (arg, i)
                    {
                        if (angular.isString(arg) && arg.charAt(0) == '%') {
                            var ii = parseInt(arg.substr(1), 10);
                            args[i] = elements[ii];

                            isTokenized = true;
                        } else {
                            args[i] = params[i];
                        }
                    });

                    // If '%<pos>' is not specified, then assume
                    // target elements are prefixed to the method arguments list

                    return isTokenized ? args : [target].concat(toArray(params));
                }
            }
        ])

        /**
         * Create a service that builds a sequential chain of promises to start an $animateQueue instances
         * NOTE: This sequence chain is NOT auto-started
         */
        .factory( '$animateSequence', ['$qChain',
            function($qChain){
                return function() {
                   return $qChain().sequence( extractList(arguments) );
                };
            }
        ])

        /**
         * Create a service that builds a promise chain to start 1..n $animateQueue instances all to run in parallel
         * NOTE: This sequence chain is NOT auto-started
         */
        .factory( '$animateGroup', ['$qChain',
            function($qChain){
                return function() {
                    return $qChain().parallel( extractList(arguments) );
                };
            }
        ]);



        // **************************************
        // Internal Utility methods
        // **************************************

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

})();


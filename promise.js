(function (window, undefined) {

    var freeExports = typeof exports == 'object' && exports &&
        (typeof global == 'object' && global && global == global.global && (window = global), exports);

    var Rx = {};

    var Promise = Rx.Promise = (function () {

       var scheduleMethod;
        if (typeof window.process === 'function' && typeof Object.prototype.toString.call(window.process) === '[object process]') {
            scheduleMethod = window.process.nextTick;
        } else if (typeof window.setImmediate === 'function') {
            scheduleMethod = window.setImmediate;
        } else {
            scheduleMethod = function (action) { return window.setTimeout(action, 0); };
        }

        var STATUS_PENDING = 'pending',
            STATUS_REJECTED = 'rejected',
            STATUS_FULFILLED = 'fulfilled';

        function notifyAll (callbacks, value) {
            for (var i = 0, len = callbacks.length; i < len; i++) {
                callbacks[i](value);
            }
        }

        function deferPromise(promise, then, reject, fn) {
            return function () {
                var args = arguments;

                scheduleMethod(function () {
                    var result;
                    try {
                        result = fn.apply(promise, args);
                    } catch (e) {
                        return reject(e);
                    }

                    if (Promise.isPromise(result)) {
                        result.then(then, reject);
                    } else {
                        then(result);
                    }
                });
            };            
        }

        function PromiseState (promise) {
            this._promise = promise;
            this._callbacks = [];
            this._errbacks = [];
            this._status = STATUS_PENDING;
        }

        var promiseStatePrototype = PromiseState.prototype;

        promiseStatePrototype.fulfill = function (value) {
            if (this._status === STATUS_PENDING) {
                this._value = value;
            }
            if (this.status !== STATUS_REJECTED) {
                notifyAll(this._callbacks, this._value);
                this._callbacks = [];
                this._errbacks = [];
                this._status = STATUS_FULFILLED;
            }
        };

        promiseStatePrototype.reject = function (reason) {
            if (this._status === STATUS_PENDING) {
                this._value = reason;
            }
            if (this.status !== STATUS_FULFILLED) {
                notifyAll(this._errbacks, this._value);
                this._callbacks = [];
                this._errbacks = [];
                this._status = STATUS_REJECTED;
            }
        };

        promiseStatePrototype.then = function (callback, errback) {
            var promise = this._promise,
                thenFulfill, thenReject,

                then = new promise.constructor(function (fulfill, reject) {
                    thenFulfill = fulfill;
                    thenReject = reject;
                });

            this._callbacks.push(typeof callback === 'function' ?
                deferPromise(this._promise, thenFulfill, thenReject, callback) : thenFulfill);
            this._errbacks.push(typeof errback === 'function' ?
                deferPromise(this._promise, thenFulfill, thenReject, errback) : thenReject);

            if (this._status === STATUS_FULFILLED) {
                this.fulfill(this._value);
            } else if (this._status === STATUS_REJECTED) {
                this.reject(this._value);
            }

            return then;
        };

        function Promise (fn) {
            if (!(this instanceof Promise)) {
                return new Promise(fn);
            }

            this._state = new PromiseState(this), self = this;

            if (fn) {
                fn.call(this, function (value) {
                    self._state.fulfill(value);
                }, function (reason) {
                    self._state.reject(reason);
                });              
            }
        }

        var promisePrototype = Promise.prototype;

        promisePrototype.fulfill = function (value) {
            this._state.fulfill(value);
        };

        promisePrototype.reject = function (reason) {
            this._state.reject(reason);
        };

        promisePrototype.then = function (callback, errback) {
            return this._state.then(callback, errback);
        };

        promisePrototype.isFulfilled = function () {
            return this._state.status === STATUS_FULFILLED;
        };

        promisePrototype.isRejected = function () {
            return this._state.status === STATUS_REJECTED;
        };

        Promise.isPromise = function (other) {
            return !!other && typeof other.then === 'function';
        };

        return Promise;
    }());

    // Check for AMD
    if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
        window.Rx = Rx;
        return define(function () {
            return Rx;
        });
    } else if (freeExports) {
        if (typeof module == 'object' && module && module.exports == freeExports) {
            module.exports = Rx;
        } else {
            freeExports = Rx;
        }
    } else {
        window.Rx = Rx;
    }

}(typeof global === "object" && global ? global : this));

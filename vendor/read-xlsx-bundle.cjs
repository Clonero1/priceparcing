var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// node_modules/worker-f/commonjs/stringifyFunctionReferences.js
var require_stringifyFunctionReferences = __commonJS({
  "node_modules/worker-f/commonjs/stringifyFunctionReferences.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = stringifyFunctionReferences;
    var JAVASCRIPT_VARIABLE_NAME_REG_EXP = /^[$_\u0080-\uFFFFa-zA-Z][$_\u0080-\uFFFF\w]*$/;
    function stringifyFunctionReferences(getDependencies) {
      var functions = {};
      var variables = {};
      var references = getDependencies();
      var getReferencesSourceCode = getDependencies.toString();
      var referencedNames = getReferencesSourceCode.slice(getReferencesSourceCode.indexOf("[") + 1, getReferencesSourceCode.lastIndexOf("]")).split(",").map(function(_) {
        return _.trim();
      });
      for (var _i2 = 0; _i2 < referencedNames.length; _i2++) {
        var name = referencedNames[_i2];
        if (!JAVASCRIPT_VARIABLE_NAME_REG_EXP.test(name)) {
          throw new Error("Invalid dependency name: ".concat(name));
        }
      }
      var i = 0;
      while (i < references.length) {
        var _name = referencedNames[i];
        var value = references[i];
        if (typeof value === "function") {
          functions[_name] = getFunctionSourceCode(value, _name);
        } else {
          variables[_name] = value;
        }
        i++;
      }
      return {
        functions,
        variables
      };
    }
    function getFunctionSourceCode(func, name) {
      var funcSourceCode = func.toString();
      if (func.prototype) {
        if (funcSourceCode.indexOf("[native code]") >= 0) {
          var funcNameStartsAt = funcSourceCode.indexOf(" ", "function".length) + " ".length;
          var funcNameEndsBefore = funcSourceCode.indexOf("(", funcNameStartsAt);
          return funcSourceCode.slice(funcNameStartsAt, funcNameEndsBefore);
        } else {
          var code = funcSourceCode;
          for (var key in func.prototype) {
            code += ";" + name + ".prototype." + key + "=" + func.prototype[key].toString();
          }
          return code;
        }
      } else {
        return funcSourceCode;
      }
    }
  }
});

// node_modules/worker-f/commonjs/createWorker.js
var require_createWorker = __commonJS({
  "node_modules/worker-f/commonjs/createWorker.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = createWorker;
    var _stringifyFunctionReferences = _interopRequireDefault(require_stringifyFunctionReferences());
    function _interopRequireDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    function createWorker(createWorkerInEnvironment, createInputHandler, onError, onOutput, getFromCache, setInCache) {
      var started = false;
      var worker;
      var stop = function stop2() {
        worker.stop();
      };
      var ingest = function ingest2(data, transferList) {
        try {
          worker.ingest(data, transferList);
        } catch (error) {
          stop();
          throw error;
        }
      };
      var start = function start2(arrayOfGetDependenciesFunctions, dependenciesTransferList) {
        if (started) {
          throw new Error("Was started");
        }
        started = true;
        var cacheValue = getFromCache();
        var cachedCodeAndVars = cacheValue && cacheValue._;
        var codeAndVars = cachedCodeAndVars || getCodeAndVars(createInputHandler, arrayOfGetDependenciesFunctions);
        if (!cachedCodeAndVars) {
          setInCache({
            _: codeAndVars
          });
        }
        var code = codeAndVars[0], vars = codeAndVars[1];
        var getOtherFromCache = function getOtherFromCache2() {
          var properties = getFromCache();
          if (properties) {
            return properties.other;
          }
        };
        var setOtherInCache = function setOtherInCache2(value) {
          setInCache(Object.assign(Object.assign({}, getFromCache()), {
            other: value
          }));
        };
        worker = createWorkerInEnvironment(code, getOtherFromCache, setOtherInCache, onError, onOutput);
        if (vars) {
          ingest(vars, dependenciesTransferList);
        }
      };
      return {
        start,
        stop,
        ingest
      };
    }
    var JAVASCRIPT_CODE_BEFORE_CREATE_INPUT_HANDLER_FUNCTION = (
      // Handles any messages that're sent from the main thread.
      "var onMessage = function(data) {for (var key in data) {self[key] = data[key]}onMessage = ("
    );
    var JAVASCRIPT_CODE_AFTER_CREATE_INPUT_HANDLER_FUNCTION = ")(postMessage)}";
    function getCodeAndVars(createInputHandler, arrayOfGetDependenciesFunctions) {
      var _createFunctionsCodeA = createFunctionsCodeAndVars(arrayOfGetDependenciesFunctions), functionDefinitions = _createFunctionsCodeA[0], vars = _createFunctionsCodeA[1];
      var code = functionDefinitions + ";" + JAVASCRIPT_CODE_BEFORE_CREATE_INPUT_HANDLER_FUNCTION + createInputHandler.toString() + JAVASCRIPT_CODE_AFTER_CREATE_INPUT_HANDLER_FUNCTION;
      return [code, vars];
    }
    function createFunctionsCodeAndVars(arrayOfGetDependenciesFunctions) {
      var funcs = {};
      var vars = {};
      for (var _i2 = 0; _i2 < arrayOfGetDependenciesFunctions.length; _i2++) {
        var getDependencies = arrayOfGetDependenciesFunctions[_i2];
        var _stringifyFunctionRef = (0, _stringifyFunctionReferences["default"])(getDependencies), functions = _stringifyFunctionRef.functions, variables = _stringifyFunctionRef.variables;
        funcs = Object.assign(Object.assign({}, funcs), functions);
        vars = Object.assign(Object.assign({}, vars), variables);
      }
      var functionDefinitions = Object.keys(funcs).map(function(functionName) {
        return functionName + "=" + funcs[functionName];
      }).join(";");
      return [functionDefinitions, vars];
    }
  }
});

// node_modules/worker-f/commonjs/createWorkerFunctionOrStream.js
var require_createWorkerFunctionOrStream = __commonJS({
  "node_modules/worker-f/commonjs/createWorkerFunctionOrStream.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = createWorkerFunctionOrStream;
    var _createWorker = _interopRequireDefault(require_createWorker());
    function _interopRequireDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    function createWorkerFunctionOrStream(createWorkerInEnvironment, fnOrAlias, createMethods, createInputHandler, handleError, handleOutput) {
      var started = false;
      var stopped = false;
      var getDependenciesFunctions = [];
      var dependenciesTransferList = void 0;
      var _inputTransferList = function inputTransferList() {
        return [];
      };
      var _outputTransferList = function outputTransferList() {
        return [];
      };
      var _alias = void 0;
      var cacheValue = void 0;
      var getFromCache = function getFromCache2(cacheKey) {
        return CACHE[cacheKey];
      };
      var setInCache = function setInCache2(cacheKey, value) {
        CACHE[cacheKey] = value;
      };
      var mustHaveStarted = function mustHaveStarted2() {
        if (!started) {
          throw new Error("Not started");
        }
      };
      var mustNotHaveStarted = function mustNotHaveStarted2() {
        if (started) {
          throw new Error("Was started");
        }
      };
      var mustNotHaveStopped = function mustNotHaveStopped2() {
        if (stopped) {
          throw new Error("Was stopped");
        }
      };
      var mustNotHaveAlias = function mustNotHaveAlias2() {
        if (_alias) {
          throw new Error("Has alias");
        }
      };
      var argumentMustBeFunction = function argumentMustBeFunction2(arg) {
        if (typeof arg !== "function") {
          throw new TypeError("Argument must be a function");
        }
      };
      var fn;
      if (typeof fnOrAlias === "string") {
        _alias = fnOrAlias;
        cacheValue = getFromCache(_alias);
        if (!cacheValue || !cacheValue.$) {
          throw new Error("Not found");
        }
        fn = cacheValue.$[0];
        getDependenciesFunctions = cacheValue.$[1];
        _inputTransferList = cacheValue.$[2];
        _outputTransferList = cacheValue.$[3];
        cacheValue.$[4];
      } else {
        fn = fnOrAlias;
      }
      argumentMustBeFunction(fn);
      var worker;
      var addDependencies_ = function addDependencies_2(getDependencies) {
        mustNotHaveStopped();
        mustNotHaveStarted();
        argumentMustBeFunction(getDependencies);
        getDependenciesFunctions.push(getDependencies);
      };
      var start = function start2() {
        mustNotHaveStopped();
        mustNotHaveStarted();
        var getInitialDependencies = function getInitialDependencies2() {
          return [fn, _outputTransferList, createInputHandler];
        };
        addDependencies_(getInitialDependencies);
        started = true;
        worker.start(getDependenciesFunctions, dependenciesTransferList);
      };
      var stop = function stop2() {
        stopped = true;
        worker.stop();
      };
      var sendToWorker = function sendToWorker2(inputArgs) {
        worker.ingest([Date.now(), inputArgs], _inputTransferList.apply(void 0, inputArgs));
      };
      var numberOrUndefined;
      var workerFn = Object.assign({
        inputLatency: numberOrUndefined,
        outputLatency: numberOrUndefined,
        /**
         * Adds external dependencies.
         * These dependencies must not change after the function is started.
         *
         * @param {function} getDependencies — A "closure" function that returns an array of dependencies — global variables or functions — that will be used in this worker. If some dependencies get overlooked, the worker will throw "[name] is not defined".
         */
        addDependencies: function addDependencies(getDependencies) {
          mustNotHaveAlias();
          addDependencies_(getDependencies);
        },
        // `transferList` for the arguments of the function.
        inputTransferList: function inputTransferList(fn2) {
          mustNotHaveStopped();
          mustNotHaveStarted();
          mustNotHaveAlias();
          argumentMustBeFunction(fn2);
          _inputTransferList = fn2;
        },
        // `transferList` for the result of the function.
        outputTransferList: function outputTransferList(fn2) {
          mustNotHaveStopped();
          mustNotHaveStarted();
          mustNotHaveAlias();
          argumentMustBeFunction(fn2);
          _outputTransferList = fn2;
        },
        // (optional) Enables caching.
        alias: function alias(alias_) {
          mustNotHaveStopped();
          mustNotHaveStarted();
          mustNotHaveAlias();
          _alias = alias_;
          setInCache(_alias, {
            $: [fn, getDependenciesFunctions, _inputTransferList, _outputTransferList]
          });
        },
        start,
        stop
      }, createMethods(start, stop, started, stopped, sendToWorker, mustHaveStarted, mustNotHaveStarted, mustNotHaveStopped));
      var getOtherFromCache = function getOtherFromCache2() {
        if (_alias) {
          var properties = getFromCache(_alias);
          if (properties) {
            return properties.other;
          }
        }
      };
      var setOtherInCache = function setOtherInCache2(value) {
        if (_alias) {
          setInCache(_alias, Object.assign(Object.assign({}, getFromCache(_alias)), {
            other: value
          }));
        }
      };
      worker = (0, _createWorker["default"])(
        // Creates a worker in a specific environment such as a web browser or Node.js.
        createWorkerInEnvironment,
        // This function will be executed in the worker thread.
        // It will be stringified and injected in the worker source code.
        // It must create an input handler function.
        function(sendOutput_) {
          var inputSentTimestamp = -1;
          var inputReceivedTimestamp = -1;
          var sendOutput = function sendOutput2(output) {
            sendOutput_([inputSentTimestamp, inputReceivedTimestamp, Date.now(), output], _outputTransferList(output));
          };
          var inputHandler = createInputHandler(fn, sendOutput);
          return function(_ref) {
            var inputSentAt = _ref[0], input = _ref[1];
            inputSentTimestamp = inputSentAt;
            inputReceivedTimestamp = Date.now();
            return inputHandler(input);
          };
        },
        // This function will be executed in the main thread
        // when an error is received from the worker.
        // Currently, we are in the main thread.
        function(error) {
          if (!stopped) {
            handleError(error);
          }
        },
        // This function will be executed in the main thread
        // when output is received from the worker.
        // Currently, we are in the main thread.
        function(_ref2) {
          var inputSentTimestamp = _ref2[0], inputReceivedTimestamp = _ref2[1], outputTimestamp = _ref2[2], output = _ref2[3];
          if (!stopped) {
            if (inputSentTimestamp !== -1) {
              workerFn.inputLatency = inputReceivedTimestamp - inputSentTimestamp;
            }
            workerFn.outputLatency = Date.now() - outputTimestamp;
            handleOutput(output);
          }
        },
        // Caching.
        getOtherFromCache,
        setOtherInCache
      );
      return workerFn;
    }
    var CACHE = {};
  }
});

// node_modules/worker-f/commonjs/createWorkerFunction.js
var require_createWorkerFunction = __commonJS({
  "node_modules/worker-f/commonjs/createWorkerFunction.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = createWorkerFunction;
    var _createWorkerFunctionOrStream = _interopRequireDefault(require_createWorkerFunctionOrStream());
    function _interopRequireDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    function createWorkerFunction(createWorkerInEnvironment, fnOrAlias) {
      var resolveCall = void 0;
      var rejectCall = void 0;
      var createMethods = function createMethods2(start, stop, started, stopped, sendToWorker, mustHaveStarted, mustNotHaveStarted, mustNotHaveStopped) {
        return {
          // Calls the function. Could be used multiple times.
          call: function call() {
            for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }
            mustNotHaveStopped();
            mustHaveStarted();
            if (resolveCall || rejectCall) {
              throw new Error("Previous call not finished");
            }
            return new Promise(function(resolve, reject) {
              resolveCall = resolve;
              rejectCall = reject;
              sendToWorker(args);
            });
          },
          // Calls the function once.
          callOnce: function callOnce() {
            start();
            return this.call.apply(this, arguments)["finally"](stop);
          }
        };
      };
      var createInputHandler = function createInputHandler2(fn, emit) {
        var isPromise = function isPromise2(anything) {
          return anything !== null && typeof anything === "object" && typeof anything.then === "function";
        };
        return function(args) {
          var result = fn.apply(void 0, args);
          if (isPromise(result)) {
            result.then(emit);
          } else {
            emit(result);
          }
        };
      };
      var handleError = function handleError2(error) {
        if (rejectCall) {
          rejectCall(error);
          resolveCall = void 0;
          rejectCall = void 0;
        } else {
          throw new Error("`reject` callback not found");
        }
      };
      var handleOutput = function handleOutput2(output) {
        if (resolveCall) {
          resolveCall(output);
          resolveCall = void 0;
          rejectCall = void 0;
        } else {
          throw new Error("`resolve` callback not found");
        }
      };
      return (0, _createWorkerFunctionOrStream["default"])(createWorkerInEnvironment, fnOrAlias, createMethods, createInputHandler, handleError, handleOutput);
    }
  }
});

// node_modules/worker-f/commonjs/environment/createWorkerInNode.js
var require_createWorkerInNode = __commonJS({
  "node_modules/worker-f/commonjs/environment/createWorkerInNode.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = createWorkerInNode;
    var _nodeWorker_threads = require("node:worker_threads");
    function createWorkerInNode(javascriptCode, getFromCache, setInCache, onError, onOutput) {
      var requestedTermination = false;
      var processedError = false;
      var code = getFromCache();
      if (!code) {
        code = createWorkerCode(javascriptCode);
        setInCache(code);
      }
      var worker = new _nodeWorker_threads.Worker(code, {
        eval: true
      }).on("error", function(error) {
        processedError = true;
        onError(error);
      }).on("message", function(message) {
        onOutput(message);
      }).on("exit", function(exitCode) {
        if (exitCode && !processedError && !requestedTermination) {
          onError(new Error("Exited with code " + exitCode));
        }
      });
      var stop = function stop2() {
        requestedTermination = true;
        var promise = _nodeWorker_threads.Worker.prototype.terminate.call(worker);
      };
      return {
        stop,
        ingest: worker.postMessage.bind(worker)
      };
    }
    function createWorkerCode(javascriptCode) {
      return javascriptCode + ";" + JAVASCRIPT_CODE_ADDITIONAL;
    }
    var JAVASCRIPT_CODE_ADDITIONAL = 'var workerThreads = require("worker_threads");workerThreads.parentPort.on("message", function(data) {onMessage(data)});var postMessage = function(data, transferList) {workerThreads.parentPort.postMessage(data, transferList)};self = global';
  }
});

// node_modules/worker-f/commonjs/export/node/createWorkerFunctionInNode.js
var require_createWorkerFunctionInNode = __commonJS({
  "node_modules/worker-f/commonjs/export/node/createWorkerFunctionInNode.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = createWorkerFunctionInNode;
    var _createWorkerFunction = _interopRequireDefault(require_createWorkerFunction());
    var _createWorkerInNode = _interopRequireDefault(require_createWorkerInNode());
    function _interopRequireDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    function createWorkerFunctionInNode(fnOrAlias) {
      return (0, _createWorkerFunction["default"])(_createWorkerInNode["default"], fnOrAlias);
    }
  }
});

// node_modules/worker-f/commonjs/export/node/index.js
var require_node = __commonJS({
  "node_modules/worker-f/commonjs/export/node/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "default", {
      enumerable: true,
      get: function get() {
        return _createWorkerFunctionInNode["default"];
      }
    });
    var _createWorkerFunctionInNode = _interopRequireDefault(require_createWorkerFunctionInNode());
    function _interopRequireDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
  }
});

// node_modules/worker-f/node/index.cjs
var require_node2 = __commonJS({
  "node_modules/worker-f/node/index.cjs"(exports2, module2) {
    exports2 = module2.exports = require_node().default;
    exports2["default"] = require_node().default;
  }
});

// node_modules/read-excel-file/commonjs/saxen/parser.js
var require_parser = __commonJS({
  "node_modules/read-excel-file/commonjs/saxen/parser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = Parser_;
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    function Parser_(options) {
      var fromCharCode = String.fromCharCode;
      var hasOwnProperty = Object.prototype.hasOwnProperty;
      var ENTITY_PATTERN = /&#(\d+);|&#x([0-9a-f]+);|&(\w+);/ig;
      var ENTITY_MAPPING = {
        "amp": "&",
        "apos": "'",
        "gt": ">",
        "lt": "<",
        "quot": '"'
      };
      Object.keys(ENTITY_MAPPING).forEach(function(k) {
        ENTITY_MAPPING[k.toUpperCase()] = ENTITY_MAPPING[k];
      });
      function replaceEntities(_, d, x, z) {
        if (z) {
          if (hasOwnProperty.call(ENTITY_MAPPING, z)) {
            return ENTITY_MAPPING[z];
          } else {
            return "&" + z + ";";
          }
        }
        if (d) {
          return fromCharCode(d);
        }
        return fromCharCode(parseInt(x, 16));
      }
      function decodeEntities(s) {
        if (s.length > 3 && s.indexOf("&") !== -1) {
          return s.replace(ENTITY_PATTERN, replaceEntities);
        }
        return s;
      }
      var NON_WHITESPACE_OUTSIDE_ROOT_NODE = "non-whitespace outside of root node";
      function error(msg) {
        return new Error(msg);
      }
      function missingNamespaceForPrefix(prefix) {
        return "missing namespace for prefix <" + prefix + ">";
      }
      function getter(getFn) {
        return {
          "get": getFn,
          "enumerable": true
        };
      }
      function cloneNsMatrix(nsMatrix) {
        var clone = {}, key;
        for (key in nsMatrix) {
          clone[key] = nsMatrix[key];
        }
        return clone;
      }
      var NAME_CACHE = /* @__PURE__ */ Symbol("nameCache");
      function uriPrefix(prefix) {
        return prefix + "$uri";
      }
      function buildNsMatrix(nsUriToPrefix) {
        var nsMatrix = {}, uri, prefix;
        for (uri in nsUriToPrefix) {
          prefix = nsUriToPrefix[uri];
          nsMatrix[prefix] = prefix;
          nsMatrix[uriPrefix(prefix)] = uri;
        }
        return nsMatrix;
      }
      function noopGetContext() {
        return {
          line: 0,
          column: 0
        };
      }
      function throwFunc(err) {
        throw err;
      }
      function Parser(options2) {
        if (!this) {
          return new Parser(options2);
        }
        var proxy = options2 && options2["proxy"];
        var onText, onOpenTag, onCloseTag, onCDATA, onError = throwFunc, onWarning, onComment, onQuestion, onAttention;
        var getContext = noopGetContext;
        var streaming = false;
        var rootTagFound = false;
        var leftoverXml = "";
        var maybeNS = false;
        var isNamespace = false;
        var returnError = null;
        var parseStop = false;
        var nsMatrixStack, nsMatrix, nodeStack;
        var nsUriToPrefix;
        function handleError(err) {
          if (!(err instanceof Error)) {
            err = error(err);
          }
          returnError = err;
          onError(err, getContext);
        }
        function handleWarning(err) {
          if (!onWarning) {
            return;
          }
          if (!(err instanceof Error)) {
            err = error(err);
          }
          onWarning(err, getContext);
        }
        this["on"] = function(name, cb) {
          if (typeof cb !== "function") {
            throw error("required args <name, cb>");
          }
          switch (name) {
            case "openTag":
              onOpenTag = cb;
              break;
            case "text":
              onText = cb;
              break;
            case "closeTag":
              onCloseTag = cb;
              break;
            case "error":
              onError = cb;
              break;
            case "warn":
              onWarning = cb;
              break;
            case "cdata":
              onCDATA = cb;
              break;
            case "attention":
              onAttention = cb;
              break;
            // <!XXXXX zzzz="eeee">
            case "question":
              onQuestion = cb;
              break;
            // <? ....  ?>
            case "comment":
              onComment = cb;
              break;
            default:
              throw error("unsupported event: " + name);
          }
          return this;
        };
        this["ns"] = function(nsMap) {
          if (typeof nsMap === "undefined") {
            nsMap = {};
          }
          if (_typeof(nsMap) !== "object") {
            throw error("required args <nsMap={}>");
          }
          var _nsUriToPrefix = {}, k;
          for (k in nsMap) {
            _nsUriToPrefix[k] = nsMap[k];
          }
          isNamespace = true;
          nsUriToPrefix = _nsUriToPrefix;
          return this;
        };
        function resetState() {
          nsMatrixStack = isNamespace ? [] : null;
          nsMatrix = isNamespace ? buildNsMatrix(nsUriToPrefix) : null;
          nodeStack = [];
          getContext = noopGetContext;
          parseStop = false;
          returnError = null;
          rootTagFound = false;
          leftoverXml = "";
        }
        this["parse"] = function(xml) {
          if (typeof xml !== "string") {
            throw error("required args <xml=string>");
          }
          if (streaming) {
            throw error("parse during stream; call end() first");
          }
          resetState();
          parse(xml);
          getContext = noopGetContext;
          parseStop = false;
          return returnError;
        };
        this["write"] = function(xml) {
          if (typeof xml !== "string") {
            throw error("required args <xml=string>");
          }
          if (!streaming) {
            resetState();
            streaming = true;
          }
          if (!returnError) {
            leftoverXml = parse(leftoverXml + xml, true) || "";
          }
          return this;
        };
        this["end"] = function() {
          if (!streaming) {
            resetState();
          }
          streaming = false;
          if (!returnError) {
            parse(leftoverXml);
          }
          leftoverXml = "";
          getContext = noopGetContext;
          parseStop = false;
          return returnError;
        };
        this["stop"] = function() {
          parseStop = true;
        };
        function parse(xml) {
          var streaming2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : false;
          var elNameCache = null, elNameCacheMatrix = null;
          var _nsMatrix, anonymousNsCount = 0, tagStart = false, tagEnd = false, i = 0, j = 0, x, y, q, w, v, xmlns, elementName, _elementName, elementProxy;
          var attrsString = "", attrsStart = 0, cachedAttrs;
          function normalizeAttrName(name, defaultAlias) {
            var w2 = name.indexOf(":");
            if (w2 === -1) {
              return name;
            }
            var nsName = nsMatrix[name.substring(0, w2)];
            if (!nsName) {
              handleWarning(missingNamespaceForPrefix(name.substring(0, w2)));
              return null;
            }
            return defaultAlias === nsName ? name.substr(w2 + 1) : nsName + name.substr(w2);
          }
          function getAttrs() {
            if (cachedAttrs !== null) {
              return cachedAttrs;
            }
            var nsUri, nsUriPrefix, defaultAlias = isNamespace && nsMatrix["xmlns"], attrList = isNamespace && maybeNS ? [] : null, i2 = attrsStart, s = attrsString, l = s.length, hasNewMatrix, newalias, value, alias, name, attrs = {}, seenAttrs = /* @__PURE__ */ new Set(), skipAttr, w2, j2;
            parseAttr: for (; i2 < l; i2++) {
              skipAttr = false;
              w2 = s.charCodeAt(i2);
              if (w2 === 32 || w2 < 14 && w2 > 8) {
                continue;
              }
              if (w2 < 65 || w2 > 122 || w2 > 90 && w2 < 97) {
                if (w2 !== 95 && w2 !== 58) {
                  handleWarning("illegal first char attribute name");
                  skipAttr = true;
                }
              }
              for (j2 = i2 + 1; j2 < l; j2++) {
                w2 = s.charCodeAt(j2);
                if (w2 > 96 && w2 < 123 || w2 > 64 && w2 < 91 || w2 > 47 && w2 < 59 || w2 === 46 || // '.'
                w2 === 45 || // '-'
                w2 === 95) {
                  continue;
                }
                if (w2 === 32 || w2 < 14 && w2 > 8) {
                  handleWarning("missing attribute value");
                  i2 = j2;
                  continue parseAttr;
                }
                if (w2 === 61) {
                  break;
                }
                handleWarning("illegal attribute name char");
                skipAttr = true;
              }
              name = s.substring(i2, j2);
              if (name === "xmlns:xmlns") {
                handleWarning("illegal declaration of xmlns");
                skipAttr = true;
              }
              w2 = s.charCodeAt(j2 + 1);
              if (w2 === 34) {
                j2 = s.indexOf('"', i2 = j2 + 2);
                if (j2 === -1) {
                  j2 = s.indexOf("'", i2);
                  if (j2 !== -1) {
                    handleWarning("attribute value quote missmatch");
                    skipAttr = true;
                  }
                }
              } else if (w2 === 39) {
                j2 = s.indexOf("'", i2 = j2 + 2);
                if (j2 === -1) {
                  j2 = s.indexOf('"', i2);
                  if (j2 !== -1) {
                    handleWarning("attribute value quote missmatch");
                    skipAttr = true;
                  }
                }
              } else {
                handleWarning("missing attribute value quotes");
                skipAttr = true;
                for (j2 = j2 + 1; j2 < l; j2++) {
                  w2 = s.charCodeAt(j2 + 1);
                  if (w2 === 32 || w2 < 14 && w2 > 8) {
                    break;
                  }
                }
              }
              if (j2 === -1) {
                handleWarning("missing closing quotes");
                j2 = l;
                skipAttr = true;
              }
              if (!skipAttr) {
                value = s.substring(i2, j2);
              }
              i2 = j2;
              for (; j2 + 1 < l; j2++) {
                w2 = s.charCodeAt(j2 + 1);
                if (w2 === 32 || w2 < 14 && w2 > 8) {
                  break;
                }
                if (i2 === j2) {
                  handleWarning("illegal character after attribute end");
                  skipAttr = true;
                }
              }
              i2 = j2 + 1;
              if (skipAttr) {
                continue parseAttr;
              }
              if (seenAttrs.has(name)) {
                handleWarning("attribute <" + name + "> already defined");
                continue;
              }
              seenAttrs.add(name);
              if (!isNamespace) {
                attrs[name] = value;
                continue;
              }
              if (maybeNS) {
                newalias = name === "xmlns" ? "xmlns" : name.charCodeAt(0) === 120 && name.substr(0, 6) === "xmlns:" ? name.substr(6) : null;
                if (newalias !== null) {
                  nsUri = decodeEntities(value);
                  nsUriPrefix = uriPrefix(newalias);
                  alias = nsUriToPrefix[nsUri];
                  if (!alias) {
                    if (newalias === "xmlns" || nsUriPrefix in nsMatrix && nsMatrix[nsUriPrefix] !== nsUri) {
                      do {
                        alias = "ns" + anonymousNsCount++;
                      } while (typeof nsMatrix[alias] !== "undefined");
                    } else {
                      alias = newalias;
                    }
                    nsUriToPrefix[nsUri] = alias;
                  }
                  if (nsMatrix[newalias] !== alias) {
                    if (!hasNewMatrix) {
                      nsMatrix = cloneNsMatrix(nsMatrix);
                      hasNewMatrix = true;
                    }
                    nsMatrix[newalias] = alias;
                    if (newalias === "xmlns") {
                      nsMatrix[uriPrefix(alias)] = nsUri;
                      defaultAlias = alias;
                    }
                    nsMatrix[nsUriPrefix] = nsUri;
                  }
                  attrs[name] = value;
                  continue;
                }
                attrList.push(name, value);
                continue;
              }
              name = normalizeAttrName(name, defaultAlias);
              if (name === null) {
                continue;
              }
              attrs[name] = value;
            }
            if (maybeNS) {
              for (i2 = 0, l = attrList.length; i2 < l; i2++) {
                name = normalizeAttrName(attrList[i2++], defaultAlias);
                value = attrList[i2];
                if (name === null) {
                  continue;
                }
                attrs[name] = value;
              }
            }
            return cachedAttrs = attrs;
          }
          function getParseContext() {
            var splitsRe = /(\r\n|\r|\n)/g;
            var line = 0;
            var column = 0;
            var startOfLine = 0;
            var endOfLine = j;
            var match;
            var data;
            while (i >= startOfLine) {
              match = splitsRe.exec(xml);
              if (!match) {
                break;
              }
              endOfLine = match[0].length + match.index;
              if (endOfLine > i) {
                break;
              }
              line += 1;
              startOfLine = endOfLine;
            }
            if (i == -1) {
              column = endOfLine;
              data = xml.substring(j);
            } else if (j === 0) {
              data = xml.substring(j, i);
            } else {
              column = i - startOfLine;
              data = j == -1 ? xml.substring(i) : xml.substring(i, j + 1);
            }
            return {
              "data": data,
              "line": line,
              "column": column
            };
          }
          getContext = getParseContext;
          if (proxy) {
            elementProxy = Object.create({}, {
              "name": getter(function() {
                return elementName;
              }),
              "originalName": getter(function() {
                return _elementName;
              }),
              "attrs": getter(getAttrs),
              "ns": getter(function() {
                return nsMatrix;
              })
            });
          }
          while (j !== -1) {
            if (xml.charCodeAt(j) === 60) {
              i = j;
            } else {
              i = xml.indexOf("<", j);
            }
            if (i === -1) {
              if (streaming2) {
                return xml.substring(j);
              }
              if (nodeStack.length) {
                return handleError("unexpected end of file");
              }
              if (!rootTagFound) {
                return handleError("missing start tag");
              }
              if (j < xml.length) {
                if (xml.substring(j).trim()) {
                  handleWarning(NON_WHITESPACE_OUTSIDE_ROOT_NODE);
                }
              }
              return;
            }
            if (!rootTagFound) {
              rootTagFound = true;
            }
            if (j !== i) {
              if (nodeStack.length) {
                if (onText) {
                  onText(xml.substring(j, i), decodeEntities, getContext);
                  if (parseStop) {
                    return;
                  }
                }
              } else {
                if (xml.substring(j, i).trim()) {
                  handleWarning(NON_WHITESPACE_OUTSIDE_ROOT_NODE);
                  if (parseStop) {
                    return;
                  }
                }
              }
            }
            w = xml.charCodeAt(i + 1);
            if (w === 33) {
              q = xml.charCodeAt(i + 2);
              if (q === 91 && xml.substr(i + 3, 6) === "CDATA[") {
                j = xml.indexOf("]]>", i);
                if (j === -1) {
                  if (streaming2) {
                    return xml.substring(i);
                  }
                  return handleError("unclosed cdata");
                }
                if (onCDATA) {
                  onCDATA(xml.substring(i + 9, j), getContext);
                  if (parseStop) {
                    return;
                  }
                }
                j += 3;
                continue;
              }
              if (q === 45 && xml.charCodeAt(i + 3) === 45) {
                j = xml.indexOf("-->", i);
                if (j === -1) {
                  if (streaming2) {
                    return xml.substring(i);
                  }
                  return handleError("unclosed comment");
                }
                if (onComment) {
                  onComment(xml.substring(i + 4, j), decodeEntities, getContext);
                  if (parseStop) {
                    return;
                  }
                }
                j += 3;
                continue;
              }
            }
            if (w === 63) {
              j = xml.indexOf("?>", i);
              if (j === -1) {
                if (streaming2) {
                  return xml.substring(i);
                }
                return handleError("unclosed question");
              }
              if (onQuestion) {
                onQuestion(xml.substring(i, j + 2), getContext);
                if (parseStop) {
                  return;
                }
              }
              j += 2;
              continue;
            }
            for (x = i + 1; ; x++) {
              v = xml.charCodeAt(x);
              if (isNaN(v)) {
                if (streaming2) {
                  return xml.substring(i);
                }
                j = -1;
                return handleError("unclosed tag");
              }
              if (v === 34) {
                q = xml.indexOf('"', x + 1);
                x = q !== -1 ? q : x;
              } else if (v === 39) {
                q = xml.indexOf("'", x + 1);
                x = q !== -1 ? q : x;
              } else if (v === 62) {
                j = x;
                break;
              }
            }
            if (w === 33) {
              if (onAttention) {
                onAttention(xml.substring(i, j + 1), decodeEntities, getContext);
                if (parseStop) {
                  return;
                }
              }
              j += 1;
              continue;
            }
            cachedAttrs = {};
            if (w === 47) {
              tagStart = false;
              tagEnd = true;
              if (!nodeStack.length) {
                return handleError("missing open tag");
              }
              x = elementName = nodeStack.pop();
              q = i + 2 + x.length;
              if (xml.substring(i + 2, q) !== x) {
                return handleError("closing tag mismatch");
              }
              for (; q < j; q++) {
                w = xml.charCodeAt(q);
                if (w === 32 || w > 8 && w < 14) {
                  continue;
                }
                return handleError("close tag");
              }
            } else {
              if (xml.charCodeAt(j - 1) === 47) {
                x = elementName = xml.substring(i + 1, j - 1);
                tagStart = true;
                tagEnd = true;
              } else {
                x = elementName = xml.substring(i + 1, j);
                tagStart = true;
                tagEnd = false;
              }
              if (!(w > 96 && w < 123 || w > 64 && w < 91 || w === 95 || w === 58)) {
                return handleError("illegal first char nodeName");
              }
              for (q = 1, y = x.length; q < y; q++) {
                w = x.charCodeAt(q);
                if (w > 96 && w < 123 || w > 64 && w < 91 || w > 47 && w < 59 || w === 45 || w === 95 || w == 46) {
                  continue;
                }
                if (w === 32 || w < 14 && w > 8) {
                  elementName = x.substring(0, q);
                  cachedAttrs = null;
                  break;
                }
                return handleError("invalid nodeName");
              }
              if (!tagEnd) {
                nodeStack.push(elementName);
              }
            }
            if (isNamespace) {
              _nsMatrix = nsMatrix;
              if (tagStart) {
                if (!tagEnd) {
                  nsMatrixStack.push(_nsMatrix);
                }
                if (cachedAttrs === null) {
                  if (maybeNS = x.indexOf("xmlns", q) !== -1) {
                    attrsStart = q;
                    attrsString = x;
                    getAttrs();
                    maybeNS = false;
                  }
                }
              }
              _elementName = elementName;
              if (elNameCacheMatrix !== nsMatrix) {
                elNameCache = nsMatrix[NAME_CACHE];
                if (elNameCache === void 0) {
                  elNameCache = nsMatrix[NAME_CACHE] = {};
                }
                elNameCacheMatrix = nsMatrix;
              }
              var _cachedName = elNameCache[elementName];
              if (_cachedName !== void 0) {
                elementName = _cachedName;
              } else {
                w = elementName.indexOf(":");
                if (w !== -1) {
                  xmlns = nsMatrix[elementName.substring(0, w)];
                  if (!xmlns) {
                    return handleError("missing namespace on <" + _elementName + ">");
                  }
                  elementName = elementName.substr(w + 1);
                } else {
                  xmlns = nsMatrix["xmlns"];
                }
                if (xmlns) {
                  elementName = xmlns + ":" + elementName;
                }
                elNameCache[_elementName] = elementName;
              }
            }
            if (tagStart) {
              attrsStart = q;
              attrsString = x;
              if (onOpenTag) {
                if (proxy) {
                  onOpenTag(elementProxy, decodeEntities, tagEnd, getContext);
                } else {
                  onOpenTag(elementName, getAttrs, decodeEntities, tagEnd, getContext);
                }
                if (parseStop) {
                  return;
                }
              }
            }
            if (tagEnd) {
              if (onCloseTag) {
                onCloseTag(proxy ? elementProxy : elementName, decodeEntities, tagStart, getContext);
                if (parseStop) {
                  return;
                }
              }
              if (isNamespace) {
                if (!tagStart) {
                  nsMatrix = nsMatrixStack.pop();
                } else {
                  nsMatrix = _nsMatrix;
                }
              }
            }
            j += 1;
          }
        }
      }
      return new Parser(options);
    }
  }
});

// node_modules/read-excel-file/commonjs/xml/parseXmlStream.saxen.js
var require_parseXmlStream_saxen = __commonJS({
  "node_modules/read-excel-file/commonjs/xml/parseXmlStream.saxen.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = parseXmlStream;
    var _parser = _interopRequireDefault(require_parser());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function parseXmlStream(state, onOpenTag, onCloseTag, onText) {
      var errored = false;
      var mustNotHaveErrored = function mustNotHaveErrored2() {
        if (errored) {
          throw new Error("Errored");
        }
      };
      var resolvePromise;
      var parser = new _parser["default"]();
      var write = function write2(xml) {
        mustNotHaveErrored();
        parser.write(xml);
      };
      var end = function end2() {
        mustNotHaveErrored();
        parser.end();
        resolvePromise();
      };
      var promise = new Promise(function(resolve, reject) {
        resolvePromise = resolve;
        var onerror = function onerror2(error) {
          errored = true;
          throw error;
        };
        var ontext = function ontext2(text, decodeEntities) {
          if (onText) {
            onText(decodeEntities(text), state);
          }
        };
        var onopentag = function onopentag2(elementName, getAttributes, decodeEntities, selfClosing, getContext) {
          if (onOpenTag) {
            var attributes = getAttributes();
            for (var name in attributes) {
              attributes[trimXmlnsPrefix(name, true)] = decodeEntities(attributes[name]);
            }
            onOpenTag(trimXmlnsPrefix(elementName), attributes, state);
          }
        };
        var onclosetag = function onclosetag2(elementName) {
          if (onCloseTag) {
            onCloseTag(trimXmlnsPrefix(elementName), state);
          }
        };
        parser.on("error", onerror);
        parser.on("text", ontext);
        parser.on("openTag", onopentag);
        parser.on("closeTag", onclosetag);
      });
      return {
        promise,
        write,
        end
      };
    }
    function trimXmlnsPrefix(string, isAttributeName) {
      var i = 0;
      while (i < string.length) {
        if (string[i] === ":") {
          if (isAttributeName && i === 5 && string.slice(0, 5) === "xmlns") {
          } else {
            return string.slice(i + 1);
          }
        }
        i++;
      }
      return string;
    }
  }
});

// node_modules/read-excel-file/commonjs/xml/parseXmlStream.js
var require_parseXmlStream = __commonJS({
  "node_modules/read-excel-file/commonjs/xml/parseXmlStream.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    Object.defineProperty(exports2, "default", {
      enumerable: true,
      get: function get() {
        return _parseXmlStreamSaxen["default"];
      }
    });
    var _parseXmlStreamSaxen = _interopRequireDefault(require_parseXmlStream_saxen());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
  }
});

// node_modules/read-excel-file/commonjs/xlsx/InvalidSpreadsheetError.js
var require_InvalidSpreadsheetError = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/InvalidSpreadsheetError.js"(exports2) {
    "use strict";
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = void 0;
    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
      }
    }
    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      Object.defineProperty(Constructor, "prototype", { writable: false });
      return Constructor;
    }
    function _toPropertyKey(arg) {
      var key = _toPrimitive(arg, "string");
      return _typeof(key) === "symbol" ? key : String(key);
    }
    function _toPrimitive(input, hint) {
      if (_typeof(input) !== "object" || input === null) return input;
      var prim = input[Symbol.toPrimitive];
      if (prim !== void 0) {
        var res = prim.call(input, hint || "default");
        if (_typeof(res) !== "object") return res;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return (hint === "string" ? String : Number)(input);
    }
    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }
    function _inherits(subClass, superClass) {
      if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function");
      }
      subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } });
      Object.defineProperty(subClass, "prototype", { writable: false });
      if (superClass) _setPrototypeOf(subClass, superClass);
    }
    function _createSuper(Derived) {
      var hasNativeReflectConstruct = _isNativeReflectConstruct();
      return function _createSuperInternal() {
        var Super = _getPrototypeOf(Derived), result;
        if (hasNativeReflectConstruct) {
          var NewTarget = _getPrototypeOf(this).constructor;
          result = Reflect.construct(Super, arguments, NewTarget);
        } else {
          result = Super.apply(this, arguments);
        }
        return _possibleConstructorReturn(this, result);
      };
    }
    function _possibleConstructorReturn(self, call) {
      if (call && (_typeof(call) === "object" || typeof call === "function")) {
        return call;
      } else if (call !== void 0) {
        throw new TypeError("Derived constructors may only return object or undefined");
      }
      return _assertThisInitialized(self);
    }
    function _assertThisInitialized(self) {
      if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      }
      return self;
    }
    function _wrapNativeSuper(Class) {
      var _cache = typeof Map === "function" ? /* @__PURE__ */ new Map() : void 0;
      _wrapNativeSuper = function _wrapNativeSuper2(Class2) {
        if (Class2 === null || !_isNativeFunction(Class2)) return Class2;
        if (typeof Class2 !== "function") {
          throw new TypeError("Super expression must either be null or a function");
        }
        if (typeof _cache !== "undefined") {
          if (_cache.has(Class2)) return _cache.get(Class2);
          _cache.set(Class2, Wrapper);
        }
        function Wrapper() {
          return _construct(Class2, arguments, _getPrototypeOf(this).constructor);
        }
        Wrapper.prototype = Object.create(Class2.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } });
        return _setPrototypeOf(Wrapper, Class2);
      };
      return _wrapNativeSuper(Class);
    }
    function _construct(Parent, args, Class) {
      if (_isNativeReflectConstruct()) {
        _construct = Reflect.construct.bind();
      } else {
        _construct = function _construct2(Parent2, args2, Class2) {
          var a = [null];
          a.push.apply(a, args2);
          var Constructor = Function.bind.apply(Parent2, a);
          var instance = new Constructor();
          if (Class2) _setPrototypeOf(instance, Class2.prototype);
          return instance;
        };
      }
      return _construct.apply(null, arguments);
    }
    function _isNativeReflectConstruct() {
      if (typeof Reflect === "undefined" || !Reflect.construct) return false;
      if (Reflect.construct.sham) return false;
      if (typeof Proxy === "function") return true;
      try {
        Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
        }));
        return true;
      } catch (e) {
        return false;
      }
    }
    function _isNativeFunction(fn) {
      return Function.toString.call(fn).indexOf("[native code]") !== -1;
    }
    function _setPrototypeOf(o, p) {
      _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
        o2.__proto__ = p2;
        return o2;
      };
      return _setPrototypeOf(o, p);
    }
    function _getPrototypeOf(o) {
      _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf2(o2) {
        return o2.__proto__ || Object.getPrototypeOf(o2);
      };
      return _getPrototypeOf(o);
    }
    var InvalidSpreadsheetError = exports2["default"] = /* @__PURE__ */ (function(_Error) {
      _inherits(InvalidSpreadsheetError2, _Error);
      var _super = _createSuper(InvalidSpreadsheetError2);
      function InvalidSpreadsheetError2(message) {
        var _this;
        _classCallCheck(this, InvalidSpreadsheetError2);
        _this = _super.call(this, message);
        _this.name = "InvalidSpreadsheetError";
        return _this;
      }
      return _createClass(InvalidSpreadsheetError2);
    })(/* @__PURE__ */ _wrapNativeSuper(Error));
  }
});

// node_modules/read-excel-file/commonjs/xml/parseXml.js
var require_parseXml = __commonJS({
  "node_modules/read-excel-file/commonjs/xml/parseXml.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = parseXml;
    var _parseXmlStream = _interopRequireDefault(require_parseXmlStream());
    var _InvalidSpreadsheetError = _interopRequireDefault(require_InvalidSpreadsheetError());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function parseXml(xml, state, onOpenTag, onCloseTag, onText, onProgress) {
      var parser = (0, _parseXmlStream["default"])(state, onOpenTag, onCloseTag, onText);
      if (onProgress) {
        parseXmlInChunks(parser, xml, onProgress);
      } else {
        parser.write(xml);
        parser.end();
      }
      return parser.promise.then(function(result) {
        return result;
      }, function(error) {
        var spreadsheetError = new _InvalidSpreadsheetError["default"](error.message);
        spreadsheetError.stack = error.stack;
        spreadsheetError.cause = error;
        throw spreadsheetError;
      });
      function parseXmlInChunks(parser2, xml2, onProgress2, nonBlocking) {
        var MAX_CHUNK_PROCESSING_TIME = 7;
        var INITIAL_CHUNK_SIZE = 64 * 1024;
        var chunksCount = 0;
        var chunkSize = INITIAL_CHUNK_SIZE;
        var parseNextChunk = function parseNextChunk2() {
          chunksCount++;
          var startedAt = Date.now();
          if (xml2.length > chunkSize) {
            parser2.write(xml2.slice(0, chunkSize));
            if (onProgress2) {
              onProgress2(false);
            }
            xml2 = xml2.slice(chunkSize);
            var chunkProcessingTime = Date.now() - startedAt;
            if (chunkProcessingTime < MAX_CHUNK_PROCESSING_TIME * 0.5) {
              chunkSize *= 2;
            } else if (chunkProcessingTime > MAX_CHUNK_PROCESSING_TIME) {
              chunkSize /= 2;
            }
            return true;
          } else {
            parser2.write(xml2);
            parser2.end();
            if (onProgress2) {
              onProgress2(true);
            }
            return false;
          }
        };
        var loop = function loop2() {
          if (parseNextChunk()) {
            if (nonBlocking) {
              if (typeof setImmediate !== "undefined") {
                setImmediate(loop2);
              } else {
                setTimeout(loop2, 0);
              }
            } else {
              loop2();
            }
          } else {
          }
        };
        loop();
      }
    }
  }
});

// node_modules/unzipper-esm/dist/ZipFileError.js
var require_ZipFileError = __commonJS({
  "node_modules/unzipper-esm/dist/ZipFileError.js"(exports2) {
    "use strict";
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.createZipFileError = createZipFileError;
    exports2["default"] = void 0;
    function _defineProperties(e, r) {
      for (var t = 0; t < r.length; t++) {
        var o = r[t];
        o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey(o.key), o);
      }
    }
    function _createClass(e, r, t) {
      return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: false }), e;
    }
    function _toPropertyKey(t) {
      var i = _toPrimitive(t, "string");
      return "symbol" == _typeof(i) ? i : i + "";
    }
    function _toPrimitive(t, r) {
      if ("object" != _typeof(t) || !t) return t;
      var e = t[Symbol.toPrimitive];
      if (void 0 !== e) {
        var i = e.call(t, r || "default");
        if ("object" != _typeof(i)) return i;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return ("string" === r ? String : Number)(t);
    }
    function _classCallCheck(a, n) {
      if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
    }
    function _callSuper(t, o, e) {
      return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e));
    }
    function _possibleConstructorReturn(t, e) {
      if (e && ("object" == _typeof(e) || "function" == typeof e)) return e;
      if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
      return _assertThisInitialized(t);
    }
    function _assertThisInitialized(e) {
      if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      return e;
    }
    function _inherits(t, e) {
      if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
      t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: true, configurable: true } }), Object.defineProperty(t, "prototype", { writable: false }), e && _setPrototypeOf(t, e);
    }
    function _wrapNativeSuper(t) {
      var r = "function" == typeof Map ? /* @__PURE__ */ new Map() : void 0;
      return _wrapNativeSuper = function _wrapNativeSuper2(t2) {
        if (null === t2 || !_isNativeFunction(t2)) return t2;
        if ("function" != typeof t2) throw new TypeError("Super expression must either be null or a function");
        if (void 0 !== r) {
          if (r.has(t2)) return r.get(t2);
          r.set(t2, Wrapper);
        }
        function Wrapper() {
          return _construct(t2, arguments, _getPrototypeOf(this).constructor);
        }
        return Wrapper.prototype = Object.create(t2.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }), _setPrototypeOf(Wrapper, t2);
      }, _wrapNativeSuper(t);
    }
    function _construct(t, e, r) {
      if (_isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments);
      var o = [null];
      o.push.apply(o, e);
      var p = new (t.bind.apply(t, o))();
      return r && _setPrototypeOf(p, r.prototype), p;
    }
    function _isNativeReflectConstruct() {
      try {
        var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
        }));
      } catch (t2) {
      }
      return (_isNativeReflectConstruct = function _isNativeReflectConstruct2() {
        return !!t;
      })();
    }
    function _isNativeFunction(t) {
      try {
        return -1 !== Function.toString.call(t).indexOf("[native code]");
      } catch (n) {
        return "function" == typeof t;
      }
    }
    function _setPrototypeOf(t, e) {
      return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t2, e2) {
        return t2.__proto__ = e2, t2;
      }, _setPrototypeOf(t, e);
    }
    function _getPrototypeOf(t) {
      return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t2) {
        return t2.__proto__ || Object.getPrototypeOf(t2);
      }, _getPrototypeOf(t);
    }
    var ZipFileError = exports2["default"] = /* @__PURE__ */ (function(_Error) {
      function ZipFileError2(code, message) {
        var _this;
        _classCallCheck(this, ZipFileError2);
        _this = _callSuper(this, ZipFileError2, [message || code]);
        _this.code = code;
        return _this;
      }
      _inherits(ZipFileError2, _Error);
      return _createClass(ZipFileError2);
    })(/* @__PURE__ */ _wrapNativeSuper(Error));
    function createZipFileError(error) {
      var zipFileError = new ZipFileError(error.code, error.message);
      if (error.stack) {
        zipFileError.stack = error.stack;
      }
      Error.captureStackTrace(zipFileError, createZipFileError);
      zipFileError.cause = error;
      return zipFileError;
    }
  }
});

// node_modules/unzipper-esm/dist/PullStream.js
var require_PullStream = __commonJS({
  "node_modules/unzipper-esm/dist/PullStream.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = void 0;
    var _stream2 = require("stream");
    var _ZipFileError = _interopRequireDefault(require_ZipFileError());
    function _interopRequireDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    function _classCallCheck(a, n) {
      if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
    }
    function _defineProperties(e, r) {
      for (var t = 0; t < r.length; t++) {
        var o = r[t];
        o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey(o.key), o);
      }
    }
    function _createClass(e, r, t) {
      return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: false }), e;
    }
    function _toPropertyKey(t) {
      var i = _toPrimitive(t, "string");
      return "symbol" == _typeof(i) ? i : i + "";
    }
    function _toPrimitive(t, r) {
      if ("object" != _typeof(t) || !t) return t;
      var e = t[Symbol.toPrimitive];
      if (void 0 !== e) {
        var i = e.call(t, r || "default");
        if ("object" != _typeof(i)) return i;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return ("string" === r ? String : Number)(t);
    }
    function _callSuper(t, o, e) {
      return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e));
    }
    function _possibleConstructorReturn(t, e) {
      if (e && ("object" == _typeof(e) || "function" == typeof e)) return e;
      if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
      return _assertThisInitialized(t);
    }
    function _assertThisInitialized(e) {
      if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      return e;
    }
    function _isNativeReflectConstruct() {
      try {
        var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
        }));
      } catch (t2) {
      }
      return (_isNativeReflectConstruct = function _isNativeReflectConstruct2() {
        return !!t;
      })();
    }
    function _getPrototypeOf(t) {
      return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t2) {
        return t2.__proto__ || Object.getPrototypeOf(t2);
      }, _getPrototypeOf(t);
    }
    function _inherits(t, e) {
      if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
      t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: true, configurable: true } }), Object.defineProperty(t, "prototype", { writable: false }), e && _setPrototypeOf(t, e);
    }
    function _setPrototypeOf(t, e) {
      return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t2, e2) {
        return t2.__proto__ = e2, t2;
      }, _setPrototypeOf(t, e);
    }
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    var FUNCTION_STRING = "function";
    var PullStreamConstructor = function PullStreamConstructor2() {
      this.buffer = Buffer.from("");
      var self = this;
      self.on("finish", function() {
        self.finished = true;
        self.emit("chunk", false);
      });
    };
    var _write2 = function _write(chunk, e, cb) {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.cb = cb;
      this.emit("chunk");
    };
    var _stream = function stream(eof, includeEof) {
      var p = new _stream2.PassThrough();
      var done;
      var self = this;
      function cb() {
        if (_typeof(self.cb) === FUNCTION_STRING) {
          var callback = self.cb;
          self.cb = void 0;
          return callback();
        }
      }
      function pull() {
        var packet;
        if (self.buffer && self.buffer.length) {
          if (typeof eof === "number") {
            packet = self.buffer.slice(0, eof);
            self.buffer = self.buffer.slice(eof);
            eof -= packet.length;
            done = done || !eof;
          } else {
            var match = self.buffer.indexOf(eof);
            if (match !== -1) {
              self.match = match;
              if (includeEof) match = match + eof.length;
              packet = self.buffer.slice(0, match);
              self.buffer = self.buffer.slice(match);
              done = true;
            } else {
              var len = self.buffer.length - eof.length;
              if (len <= 0) {
                cb();
              } else {
                packet = self.buffer.slice(0, len);
                self.buffer = self.buffer.slice(len);
              }
            }
          }
          if (packet) p.write(packet, function() {
            if (self.buffer.length === 0 || eof.length && self.buffer.length <= eof.length) cb();
          });
        }
        if (!done) {
          if (self.finished) {
            self.removeListener("chunk", pull);
            self.emit("error", new _ZipFileError["default"]("FILE_ENDED"));
            return;
          }
        } else {
          self.removeListener("chunk", pull);
          p.end();
        }
      }
      self.on("chunk", pull);
      pull();
      return p;
    };
    var _pull = function pull(eof, includeEof) {
      if (eof === 0) return Promise.resolve("");
      if (!isNaN(eof) && this.buffer.length > eof) {
        var data = this.buffer.slice(0, eof);
        this.buffer = this.buffer.slice(eof);
        return Promise.resolve(data);
      }
      var buffer = Buffer.from("");
      var self = this;
      var concatStream = new _stream2.Transform({
        transform
      });
      function transform(d, e, cb) {
        buffer = Buffer.concat([buffer, d]);
        cb();
      }
      var rejectHandler;
      var pullStreamRejectHandler;
      return new Promise(function(resolve, reject) {
        rejectHandler = reject;
        pullStreamRejectHandler = function pullStreamRejectHandler2(e) {
          self.__emittedError = e;
          reject(e);
        };
        if (self.finished) return reject(new _ZipFileError["default"]("FILE_ENDED"));
        self.once("error", pullStreamRejectHandler);
        self.stream(eof, includeEof).on("error", reject).pipe(concatStream).on("finish", function() {
          resolve(buffer);
        }).on("error", reject);
      })["finally"](function() {
        self.removeListener("error", rejectHandler);
        self.removeListener("error", pullStreamRejectHandler);
      });
    };
    var PullStream = exports2["default"] = /* @__PURE__ */ (function(_Duplex) {
      function PullStream2() {
        var _this;
        _classCallCheck(this, PullStream2);
        _this = _callSuper(this, PullStream2, [{
          decodeStrings: false,
          objectMode: true
        }]);
        PullStreamConstructor.call(_this);
        return _this;
      }
      _inherits(PullStream2, _Duplex);
      return _createClass(PullStream2, [{
        key: "_write",
        value: function _write(chunk, e, cb) {
          return _write2.call(this, chunk, e, cb);
        }
      }, {
        key: "stream",
        value: (
          // The `eof` parameter is interpreted as `file_length` if the type is number
          // otherwise (i.e. buffer) it is interpreted as a pattern signaling end of stream
          function stream(eof, includeEof) {
            return _stream.call(this, eof, includeEof);
          }
        )
      }, {
        key: "pull",
        value: function pull(eof, includeEof) {
          return _pull.call(this, eof, includeEof);
        }
      }, {
        key: "_read",
        value: function _read() {
        }
      }]);
    })(_stream2.Duplex);
  }
});

// node_modules/unzipper-esm/dist/NoopStream.js
var require_NoopStream = __commonJS({
  "node_modules/unzipper-esm/dist/NoopStream.js"(exports2) {
    "use strict";
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = void 0;
    var _stream = require("stream");
    function _classCallCheck(a, n) {
      if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
    }
    function _defineProperties(e, r) {
      for (var t = 0; t < r.length; t++) {
        var o = r[t];
        o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey(o.key), o);
      }
    }
    function _createClass(e, r, t) {
      return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: false }), e;
    }
    function _toPropertyKey(t) {
      var i = _toPrimitive(t, "string");
      return "symbol" == _typeof(i) ? i : i + "";
    }
    function _toPrimitive(t, r) {
      if ("object" != _typeof(t) || !t) return t;
      var e = t[Symbol.toPrimitive];
      if (void 0 !== e) {
        var i = e.call(t, r || "default");
        if ("object" != _typeof(i)) return i;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return ("string" === r ? String : Number)(t);
    }
    function _callSuper(t, o, e) {
      return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e));
    }
    function _possibleConstructorReturn(t, e) {
      if (e && ("object" == _typeof(e) || "function" == typeof e)) return e;
      if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
      return _assertThisInitialized(t);
    }
    function _assertThisInitialized(e) {
      if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      return e;
    }
    function _isNativeReflectConstruct() {
      try {
        var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
        }));
      } catch (t2) {
      }
      return (_isNativeReflectConstruct = function _isNativeReflectConstruct2() {
        return !!t;
      })();
    }
    function _getPrototypeOf(t) {
      return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t2) {
        return t2.__proto__ || Object.getPrototypeOf(t2);
      }, _getPrototypeOf(t);
    }
    function _inherits(t, e) {
      if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
      t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: true, configurable: true } }), Object.defineProperty(t, "prototype", { writable: false }), e && _setPrototypeOf(t, e);
    }
    function _setPrototypeOf(t, e) {
      return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t2, e2) {
        return t2.__proto__ = e2, t2;
      }, _setPrototypeOf(t, e);
    }
    var NoopStream = exports2["default"] = /* @__PURE__ */ (function(_Transform) {
      function NoopStream2() {
        _classCallCheck(this, NoopStream2);
        return _callSuper(this, NoopStream2, arguments);
      }
      _inherits(NoopStream2, _Transform);
      return _createClass(NoopStream2, [{
        key: "_transform",
        value: function _transform(d, e, cb) {
          cb();
        }
      }]);
    })(_stream.Transform);
  }
});

// node_modules/unzipper-esm/dist/BufferStream.js
var require_BufferStream = __commonJS({
  "node_modules/unzipper-esm/dist/BufferStream.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = readAsBuffer;
    var _stream = require("stream");
    function readAsBuffer(entry) {
      return new Promise(function(resolve, reject) {
        var chunks = [];
        var bufferStream = new _stream.Transform({
          transform
        }).on("finish", function() {
          resolve(Buffer.concat(chunks));
        }).on("error", reject);
        function transform(d, e, cb) {
          chunks.push(d);
          cb();
        }
        ;
        entry.on("error", reject).pipe(bufferStream);
      });
    }
  }
});

// node_modules/unzipper-esm/dist/parseBuffer.js
var require_parseBuffer = __commonJS({
  "node_modules/unzipper-esm/dist/parseBuffer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = parse;
    function _slicedToArray(r, e) {
      return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
    }
    function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function _iterableToArrayLimit(r, l) {
      var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
      if (null != t) {
        var e, n, i, u, a = [], f = true, o = false;
        try {
          if (i = (t = t.call(r)).next, 0 === l) {
            if (Object(t) !== t) return;
            f = false;
          } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
        } catch (r2) {
          o = true, n = r2;
        } finally {
          try {
            if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return;
          } finally {
            if (o) throw n;
          }
        }
        return a;
      }
    }
    function _arrayWithHoles(r) {
      if (Array.isArray(r)) return r;
    }
    function _createForOfIteratorHelper(r, e) {
      var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
      if (!t) {
        if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) {
          t && (r = t);
          var _n = 0, F = function F2() {
          };
          return { s: F, n: function n() {
            return _n >= r.length ? { done: true } : { done: false, value: r[_n++] };
          }, e: function e2(r2) {
            throw r2;
          }, f: F };
        }
        throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }
      var o, a = true, u = false;
      return { s: function s() {
        t = t.call(r);
      }, n: function n() {
        var r2 = t.next();
        return a = r2.done, r2;
      }, e: function e2(r2) {
        u = true, o = r2;
      }, f: function f() {
        try {
          a || null == t["return"] || t["return"]();
        } finally {
          if (u) throw o;
        }
      } };
    }
    function _unsupportedIterableToArray(r, a) {
      if (r) {
        if ("string" == typeof r) return _arrayLikeToArray(r, a);
        var t = {}.toString.call(r).slice(8, -1);
        return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
      }
    }
    function _arrayLikeToArray(r, a) {
      (null == a || a > r.length) && (a = r.length);
      for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
      return n;
    }
    function parseUIntLE(buffer, offset, size) {
      var result;
      switch (size) {
        case 1:
          result = buffer.readUInt8(offset);
          break;
        case 2:
          result = buffer.readUInt16LE(offset);
          break;
        case 4:
          result = buffer.readUInt32LE(offset);
          break;
        case 8:
          result = Number(buffer.readBigUInt64LE(offset));
          break;
        default:
          throw new Error("Unsupported UInt LE size!");
      }
      return result;
    }
    function parse(buffer, format) {
      var result = {};
      var offset = 0;
      var _iterator = _createForOfIteratorHelper(format), _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done; ) {
          var _step$value = _slicedToArray(_step.value, 2), key = _step$value[0], size = _step$value[1];
          if (buffer.length >= offset + size) {
            result[key] = parseUIntLE(buffer, offset, size);
          } else {
            result[key] = null;
          }
          offset += size;
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      return result;
    }
  }
});

// node_modules/unzipper-esm/dist/parseExtraField.js
var require_parseExtraField = __commonJS({
  "node_modules/unzipper-esm/dist/parseExtraField.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = parseExtraField;
    var _parseBuffer = _interopRequireDefault(require_parseBuffer());
    function _interopRequireDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    function parseExtraField(extraField, vars) {
      var extra;
      while (!extra && extraField && extraField.length) {
        var candidateExtra = (0, _parseBuffer["default"])(extraField, [["signature", 2], ["partSize", 2]]);
        if (candidateExtra.signature === 1) {
          var fieldsToExpect = [];
          if (vars.uncompressedSize === 4294967295) fieldsToExpect.push(["uncompressedSize", 8]);
          if (vars.compressedSize === 4294967295) fieldsToExpect.push(["compressedSize", 8]);
          if (vars.offsetToLocalFileHeader === 4294967295) fieldsToExpect.push(["offsetToLocalFileHeader", 8]);
          extra = (0, _parseBuffer["default"])(extraField.slice(4), fieldsToExpect);
        } else {
          extraField = extraField.slice(candidateExtra.partSize + 4);
        }
      }
      extra = extra || {};
      if (vars.compressedSize === 4294967295) vars.compressedSize = extra.compressedSize;
      if (vars.uncompressedSize === 4294967295) vars.uncompressedSize = extra.uncompressedSize;
      if (vars.offsetToLocalFileHeader === 4294967295) vars.offsetToLocalFileHeader = extra.offsetToLocalFileHeader;
      return extra;
    }
  }
});

// node_modules/unzipper-esm/dist/parseDateTime.js
var require_parseDateTime = __commonJS({
  "node_modules/unzipper-esm/dist/parseDateTime.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = parseDateTime;
    function parseDateTime(date, time) {
      var day = date & 31;
      var month = date >> 5 & 15;
      var year = (date >> 9 & 127) + 1980;
      var seconds = time ? (time & 31) * 2 : 0;
      var minutes = time ? time >> 5 & 63 : 0;
      var hours = time ? time >> 11 : 0;
      return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
    }
  }
});

// node_modules/unzipper-esm/dist/parse.js
var require_parse = __commonJS({
  "node_modules/unzipper-esm/dist/parse.js"(exports2) {
    "use strict";
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = Parse;
    var _zlib = _interopRequireDefault(require("zlib"));
    var _stream = require("stream");
    var _PullStream2 = _interopRequireDefault(require_PullStream());
    var _NoopStream = _interopRequireDefault(require_NoopStream());
    var _BufferStream = _interopRequireDefault(require_BufferStream());
    var _parseExtraField = _interopRequireDefault(require_parseExtraField());
    var _parseDateTime = _interopRequireDefault(require_parseDateTime());
    var _parseBuffer = _interopRequireDefault(require_parseBuffer());
    var _ZipFileError = _interopRequireWildcard(require_ZipFileError());
    function _interopRequireWildcard(e, t) {
      if ("function" == typeof WeakMap) var r = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap();
      return (_interopRequireWildcard = function _interopRequireWildcard2(e2, t2) {
        if (!t2 && e2 && e2.__esModule) return e2;
        var o, i, f = { __proto__: null, "default": e2 };
        if (null === e2 || "object" != _typeof(e2) && "function" != typeof e2) return f;
        if (o = t2 ? n : r) {
          if (o.has(e2)) return o.get(e2);
          o.set(e2, f);
        }
        for (var _t in e2) "default" !== _t && {}.hasOwnProperty.call(e2, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e2, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e2[_t]);
        return f;
      })(e, t);
    }
    function _interopRequireDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    function _classCallCheck(a, n) {
      if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
    }
    function _defineProperties(e, r) {
      for (var t = 0; t < r.length; t++) {
        var o = r[t];
        o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey(o.key), o);
      }
    }
    function _createClass(e, r, t) {
      return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: false }), e;
    }
    function _toPropertyKey(t) {
      var i = _toPrimitive(t, "string");
      return "symbol" == _typeof(i) ? i : i + "";
    }
    function _toPrimitive(t, r) {
      if ("object" != _typeof(t) || !t) return t;
      var e = t[Symbol.toPrimitive];
      if (void 0 !== e) {
        var i = e.call(t, r || "default");
        if ("object" != _typeof(i)) return i;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return ("string" === r ? String : Number)(t);
    }
    function _callSuper(t, o, e) {
      return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e));
    }
    function _possibleConstructorReturn(t, e) {
      if (e && ("object" == _typeof(e) || "function" == typeof e)) return e;
      if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
      return _assertThisInitialized(t);
    }
    function _assertThisInitialized(e) {
      if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      return e;
    }
    function _isNativeReflectConstruct() {
      try {
        var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
        }));
      } catch (t2) {
      }
      return (_isNativeReflectConstruct = function _isNativeReflectConstruct2() {
        return !!t;
      })();
    }
    function _getPrototypeOf(t) {
      return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t2) {
        return t2.__proto__ || Object.getPrototypeOf(t2);
      }, _getPrototypeOf(t);
    }
    function _inherits(t, e) {
      if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
      t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: true, configurable: true } }), Object.defineProperty(t, "prototype", { writable: false }), e && _setPrototypeOf(t, e);
    }
    function _setPrototypeOf(t, e) {
      return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t2, e2) {
        return t2.__proto__ = e2, t2;
      }, _setPrototypeOf(t, e);
    }
    var endDirectorySignature = Buffer.alloc(4);
    endDirectorySignature.writeUInt32LE(101010256, 0);
    function Parse(opts) {
      return new Parser(opts);
    }
    var ParserConstructor = function ParserConstructor2(opts) {
      this._opts = opts;
      var self = this;
      self.on("finish", function() {
        self.emit("end");
        self.emit("close");
      });
      self._readRecord()["catch"](function(e) {
        if (!self.__emittedError || self.__emittedError !== e) self.emit("error", e);
      });
    };
    var _readRecord2 = function _readRecord() {
      var self = this;
      return self.pull(4).then(function(data) {
        if (data.length === 0) return;
        var signature = data.readUInt32LE(0);
        if (signature === 875721283) {
          return self._readCrxHeader();
        }
        if (signature === 67324752) {
          return self._readFile();
        } else if (signature === 33639248) {
          self.reachedCD = true;
          return self._readCentralDirectoryFileHeader();
        } else if (signature === 101010256) {
          return self._readEndOfCentralDirectoryRecord();
        } else if (self.reachedCD) {
          var includeEof = true;
          return self.pull(endDirectorySignature, includeEof).then(function() {
            return self._readEndOfCentralDirectoryRecord();
          });
        } else self.emit("error", new _ZipFileError["default"]("INVALID_SIGNATURE", "invalid signature: 0x" + signature.toString(16)));
      }).then(function(loop) {
        if (loop) {
          return self._readRecord();
        }
      });
    };
    var _readCrxHeader2 = function _readCrxHeader() {
      var self = this;
      return self.pull(12).then(function(data) {
        self.crxHeader = (0, _parseBuffer["default"])(data, [["version", 4], ["pubKeyLength", 4], ["signatureLength", 4]]);
        return self.pull(self.crxHeader.pubKeyLength + self.crxHeader.signatureLength);
      }).then(function(data) {
        self.crxHeader.publicKey = data.slice(0, self.crxHeader.pubKeyLength);
        self.crxHeader.signature = data.slice(self.crxHeader.pubKeyLength);
        self.emit("crx-header", self.crxHeader);
        return true;
      });
    };
    var _readFile2 = function _readFile() {
      var self = this;
      return self.pull(26).then(function(data) {
        var vars = (0, _parseBuffer["default"])(data, [["versionsNeededToExtract", 2], ["flags", 2], ["compressionMethod", 2], ["lastModifiedTime", 2], ["lastModifiedDate", 2], ["crc32", 4], ["compressedSize", 4], ["uncompressedSize", 4], ["fileNameLength", 2], ["extraFieldLength", 2]]);
        vars.lastModifiedDateTime = (0, _parseDateTime["default"])(vars.lastModifiedDate, vars.lastModifiedTime);
        if (self.crxHeader) vars.crxHeader = self.crxHeader;
        return self.pull(vars.fileNameLength).then(function(fileNameBuffer) {
          var fileName = fileNameBuffer.toString("utf8");
          var entry = new _stream.PassThrough();
          var __autodraining = false;
          entry.autodrain = function() {
            __autodraining = true;
            var draining = entry.pipe(new _NoopStream["default"]());
            draining.promise = function() {
              return new Promise(function(resolve, reject) {
                draining.on("finish", resolve);
                draining.on("error", reject);
              });
            };
            return draining;
          };
          entry.buffer = function() {
            return (0, _BufferStream["default"])(entry);
          };
          entry.path = fileName;
          entry.props = {};
          entry.props.path = fileName;
          entry.props.pathBuffer = fileNameBuffer;
          entry.props.flags = {
            "isUnicode": (vars.flags & 2048) != 0
          };
          entry.type = vars.uncompressedSize === 0 && /[/\\]$/.test(fileName) ? "Directory" : "File";
          if (self._opts.verbose) {
            if (entry.type === "Directory") {
              console.log("   creating:", fileName);
            } else if (entry.type === "File") {
              if (vars.compressionMethod === 0) {
                console.log(" extracting:", fileName);
              } else {
                console.log("  inflating:", fileName);
              }
            }
          }
          return self.pull(vars.extraFieldLength).then(function(extraField) {
            var extra = (0, _parseExtraField["default"])(extraField, vars);
            entry.vars = vars;
            entry.extra = extra;
            if (self._opts.forceStream) {
              self.push(entry);
            } else {
              self.emit("entry", entry);
              if (self._readableState.pipesCount || self._readableState.pipes && self._readableState.pipes.length) self.push(entry);
            }
            if (self._opts.verbose) console.log({
              filename: fileName,
              vars,
              extra
            });
            var fileSizeKnown = !(vars.flags & 8) || vars.compressedSize > 0;
            var eof;
            entry.__autodraining = __autodraining;
            var inflater = vars.compressionMethod && !__autodraining ? _zlib["default"].createInflateRaw() : (0, _stream.PassThrough)();
            if (fileSizeKnown) {
              entry.size = vars.uncompressedSize;
              eof = vars.compressedSize;
            } else {
              eof = Buffer.alloc(4);
              eof.writeUInt32LE(134695760, 0);
            }
            return new Promise(function(resolve, reject) {
              (0, _stream.pipeline)(self.stream(eof), inflater, entry, function(err) {
                if (err) {
                  if (err.code === "Z_DATA_ERROR") {
                    err = (0, _ZipFileError.createZipFileError)(err);
                  }
                  return reject(err);
                }
                return fileSizeKnown ? resolve(fileSizeKnown) : self._processDataDescriptor(entry).then(resolve)["catch"](reject);
              });
            });
          });
        });
      });
    };
    var _processDataDescriptor2 = function _processDataDescriptor(entry) {
      var self = this;
      return self.pull(16).then(function(data) {
        var vars = (0, _parseBuffer["default"])(data, [["dataDescriptorSignature", 4], ["crc32", 4], ["compressedSize", 4], ["uncompressedSize", 4]]);
        entry.size = vars.uncompressedSize;
        return true;
      });
    };
    var _readCentralDirectoryFileHeader2 = function _readCentralDirectoryFileHeader() {
      var self = this;
      return self.pull(42).then(function(data) {
        var vars = (0, _parseBuffer["default"])(data, [["versionMadeBy", 2], ["versionsNeededToExtract", 2], ["flags", 2], ["compressionMethod", 2], ["lastModifiedTime", 2], ["lastModifiedDate", 2], ["crc32", 4], ["compressedSize", 4], ["uncompressedSize", 4], ["fileNameLength", 2], ["extraFieldLength", 2], ["fileCommentLength", 2], ["diskNumber", 2], ["internalFileAttributes", 2], ["externalFileAttributes", 4], ["offsetToLocalFileHeader", 4]]);
        return self.pull(vars.fileNameLength).then(function(fileName) {
          vars.fileName = fileName.toString("utf8");
          return self.pull(vars.extraFieldLength);
        }).then(function() {
          return self.pull(vars.fileCommentLength);
        }).then(function() {
          return true;
        });
      });
    };
    var _readEndOfCentralDirectoryRecord2 = function _readEndOfCentralDirectoryRecord() {
      var self = this;
      return self.pull(18).then(function(data) {
        var vars = (0, _parseBuffer["default"])(data, [["diskNumber", 2], ["diskStart", 2], ["numberOfRecordsOnDisk", 2], ["numberOfRecords", 2], ["sizeOfCentralDirectory", 4], ["offsetToStartOfCentralDirectory", 4], ["commentLength", 2]]);
        return self.pull(vars.commentLength).then(function() {
          self.end();
          self.push(null);
        });
      });
    };
    var _promise = function promise() {
      var self = this;
      return new Promise(function(resolve, reject) {
        self.on("finish", resolve);
        self.on("error", reject);
      });
    };
    var Parser = /* @__PURE__ */ (function(_PullStream) {
      function Parser2() {
        var _this;
        var opts = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {
          verbose: false
        };
        _classCallCheck(this, Parser2);
        _this = _callSuper(this, Parser2, [opts]);
        ParserConstructor.call(_this, opts);
        return _this;
      }
      _inherits(Parser2, _PullStream);
      return _createClass(Parser2, [{
        key: "_readRecord",
        value: function _readRecord() {
          return _readRecord2.call(this);
        }
      }, {
        key: "_readCrxHeader",
        value: function _readCrxHeader() {
          return _readCrxHeader2.call(this);
        }
      }, {
        key: "_readFile",
        value: function _readFile() {
          return _readFile2.call(this);
        }
      }, {
        key: "_processDataDescriptor",
        value: function _processDataDescriptor(entry) {
          return _processDataDescriptor2.call(this, entry);
        }
      }, {
        key: "_readCentralDirectoryFileHeader",
        value: function _readCentralDirectoryFileHeader() {
          return _readCentralDirectoryFileHeader2.call(this);
        }
      }, {
        key: "_readEndOfCentralDirectoryRecord",
        value: function _readEndOfCentralDirectoryRecord() {
          return _readEndOfCentralDirectoryRecord2.call(this);
        }
      }, {
        key: "promise",
        value: function promise() {
          return _promise.call(this);
        }
      }]);
    })(_PullStream2["default"]);
  }
});

// node_modules/unzipper-esm/dist/DuplexStream.js
var require_DuplexStream = __commonJS({
  "node_modules/unzipper-esm/dist/DuplexStream.js"(exports2) {
    "use strict";
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = void 0;
    var _stream = require("stream");
    function _classCallCheck(a, n) {
      if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
    }
    function _defineProperties(e, r) {
      for (var t = 0; t < r.length; t++) {
        var o = r[t];
        o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey(o.key), o);
      }
    }
    function _createClass(e, r, t) {
      return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: false }), e;
    }
    function _toPropertyKey(t) {
      var i = _toPrimitive(t, "string");
      return "symbol" == _typeof(i) ? i : i + "";
    }
    function _toPrimitive(t, r) {
      if ("object" != _typeof(t) || !t) return t;
      var e = t[Symbol.toPrimitive];
      if (void 0 !== e) {
        var i = e.call(t, r || "default");
        if ("object" != _typeof(i)) return i;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return ("string" === r ? String : Number)(t);
    }
    function _callSuper(t, o, e) {
      return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e));
    }
    function _possibleConstructorReturn(t, e) {
      if (e && ("object" == _typeof(e) || "function" == typeof e)) return e;
      if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined");
      return _assertThisInitialized(t);
    }
    function _assertThisInitialized(e) {
      if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      return e;
    }
    function _isNativeReflectConstruct() {
      try {
        var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
        }));
      } catch (t2) {
      }
      return (_isNativeReflectConstruct = function _isNativeReflectConstruct2() {
        return !!t;
      })();
    }
    function _getPrototypeOf(t) {
      return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t2) {
        return t2.__proto__ || Object.getPrototypeOf(t2);
      }, _getPrototypeOf(t);
    }
    function _inherits(t, e) {
      if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function");
      t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: true, configurable: true } }), Object.defineProperty(t, "prototype", { writable: false }), e && _setPrototypeOf(t, e);
    }
    function _setPrototypeOf(t, e) {
      return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t2, e2) {
        return t2.__proto__ = e2, t2;
      }, _setPrototypeOf(t, e);
    }
    var DuplexStream = exports2["default"] = /* @__PURE__ */ (function(_Duplex) {
      function DuplexStream2(writable, readable, options) {
        var _this;
        _classCallCheck(this, DuplexStream2);
        _this = _callSuper(this, DuplexStream2, [options]);
        _this._writable = writable;
        _this._readable = readable;
        _this._waiting = false;
        writable.once("finish", function() {
          _this.end();
        });
        _this.once("finish", function() {
          writable.end();
        });
        readable.on("readable", function() {
          if (_this._waiting) {
            _this._waiting = false;
            _this._read();
          }
        });
        readable.once("end", function() {
          _this.push(null);
        });
        if (!options || typeof options.bubbleErrors === "undefined" || options.bubbleErrors) {
          writable.on("error", function(error) {
            _this.emit("error", error);
          });
          readable.on("error", function(error) {
            _this.emit("error", error);
          });
        }
        return _this;
      }
      _inherits(DuplexStream2, _Duplex);
      return _createClass(DuplexStream2, [{
        key: "_write",
        value: function _write(input, encoding, done) {
          this._writable.write(input, encoding, done);
        }
      }, {
        key: "_read",
        value: function _read() {
          var buffer;
          var readCount = 0;
          while ((buffer = this._readable.read()) !== null) {
            this.push(buffer);
            readCount++;
          }
          if (readCount === 0) {
            this._waiting = true;
          }
        }
      }]);
    })(_stream.Duplex);
  }
});

// node_modules/unzipper-esm/dist/parseOne.js
var require_parseOne = __commonJS({
  "node_modules/unzipper-esm/dist/parseOne.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = parseOne;
    var _stream = require("stream");
    var _DuplexStream = _interopRequireDefault(require_DuplexStream());
    var _parse = _interopRequireDefault(require_parse());
    var _BufferStream = _interopRequireDefault(require_BufferStream());
    function _interopRequireDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    function parseOne(match, opts) {
      var inStream = new _stream.PassThrough({
        objectMode: true
      });
      var outStream = new _stream.PassThrough();
      var transformer = new _stream.Transform({
        objectMode: true,
        transform
      });
      var re = match instanceof RegExp ? match : match && new RegExp(match);
      var found;
      function transform(entry, e, cb) {
        if (found || re && !re.exec(entry.path)) {
          entry.autodrain();
          return cb();
        } else {
          found = true;
          out.emit("entry", entry);
          entry.on("error", function(e2) {
            outStream.emit("error", e2);
          });
          entry.pipe(outStream).on("error", function(err) {
            cb(err);
          }).on("finish", function(d) {
            cb(null, d);
          });
        }
      }
      ;
      inStream.pipe((0, _parse["default"])(opts)).on("error", function(err) {
        outStream.emit("error", err);
      }).pipe(transformer).on("error", Object).on("finish", function() {
        if (!found) outStream.emit("error", new Error("PATTERN_NOT_FOUND"));
        else outStream.end();
      });
      var out = new _DuplexStream["default"](inStream, outStream);
      out.buffer = function() {
        return (0, _BufferStream["default"])(outStream);
      };
      return out;
    }
  }
});

// node_modules/unzipper-esm/dist/ensureDir.js
var require_ensureDir = __commonJS({
  "node_modules/unzipper-esm/dist/ensureDir.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = ensureDir;
    var _fs = _interopRequireDefault(require("fs"));
    function _interopRequireDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    function _regenerator() {
      var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag";
      function i(r2, n2, o2, i2) {
        var c2 = n2 && n2.prototype instanceof Generator ? n2 : Generator, u2 = Object.create(c2.prototype);
        return _regeneratorDefine2(u2, "_invoke", (function(r3, n3, o3) {
          var i3, c3, u3, f2 = 0, p = o3 || [], y = false, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d2(t2, r4) {
            return i3 = t2, c3 = 0, u3 = e, G.n = r4, a;
          } };
          function d(r4, n4) {
            for (c3 = r4, u3 = n4, t = 0; !y && f2 && !o4 && t < p.length; t++) {
              var o4, i4 = p[t], d2 = G.p, l = i4[2];
              r4 > 3 ? (o4 = l === n4) && (u3 = i4[(c3 = i4[4]) ? 5 : (c3 = 3, 3)], i4[4] = i4[5] = e) : i4[0] <= d2 && ((o4 = r4 < 2 && d2 < i4[1]) ? (c3 = 0, G.v = n4, G.n = i4[1]) : d2 < l && (o4 = r4 < 3 || i4[0] > n4 || n4 > l) && (i4[4] = r4, i4[5] = n4, G.n = l, c3 = 0));
            }
            if (o4 || r4 > 1) return a;
            throw y = true, n4;
          }
          return function(o4, p2, l) {
            if (f2 > 1) throw TypeError("Generator is already running");
            for (y && 1 === p2 && d(p2, l), c3 = p2, u3 = l; (t = c3 < 2 ? e : u3) || !y; ) {
              i3 || (c3 ? c3 < 3 ? (c3 > 1 && (G.n = -1), d(c3, u3)) : G.n = u3 : G.v = u3);
              try {
                if (f2 = 2, i3) {
                  if (c3 || (o4 = "next"), t = i3[o4]) {
                    if (!(t = t.call(i3, u3))) throw TypeError("iterator result is not an object");
                    if (!t.done) return t;
                    u3 = t.value, c3 < 2 && (c3 = 0);
                  } else 1 === c3 && (t = i3["return"]) && t.call(i3), c3 < 2 && (u3 = TypeError("The iterator does not provide a '" + o4 + "' method"), c3 = 1);
                  i3 = e;
                } else if ((t = (y = G.n < 0) ? u3 : r3.call(n3, G)) !== a) break;
              } catch (t2) {
                i3 = e, c3 = 1, u3 = t2;
              } finally {
                f2 = 1;
              }
            }
            return { value: t, done: y };
          };
        })(r2, o2, i2), true), u2;
      }
      var a = {};
      function Generator() {
      }
      function GeneratorFunction() {
      }
      function GeneratorFunctionPrototype() {
      }
      t = Object.getPrototypeOf;
      var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function() {
        return this;
      }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c);
      function f(e2) {
        return Object.setPrototypeOf ? Object.setPrototypeOf(e2, GeneratorFunctionPrototype) : (e2.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e2, o, "GeneratorFunction")), e2.prototype = Object.create(u), e2;
      }
      return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function() {
        return this;
      }), _regeneratorDefine2(u, "toString", function() {
        return "[object Generator]";
      }), (_regenerator = function _regenerator2() {
        return { w: i, m: f };
      })();
    }
    function _regeneratorDefine2(e, r, n, t) {
      var i = Object.defineProperty;
      try {
        i({}, "", {});
      } catch (e2) {
        i = 0;
      }
      _regeneratorDefine2 = function _regeneratorDefine(e2, r2, n2, t2) {
        function o(r3, n3) {
          _regeneratorDefine2(e2, r3, function(e3) {
            return this._invoke(r3, n3, e3);
          });
        }
        r2 ? i ? i(e2, r2, { value: n2, enumerable: !t2, configurable: !t2, writable: !t2 }) : e2[r2] = n2 : (o("next", 0), o("throw", 1), o("return", 2));
      }, _regeneratorDefine2(e, r, n, t);
    }
    function asyncGeneratorStep(n, t, e, r, o, a, c) {
      try {
        var i = n[a](c), u = i.value;
      } catch (n2) {
        return void e(n2);
      }
      i.done ? t(u) : Promise.resolve(u).then(r, o);
    }
    function _asyncToGenerator(n) {
      return function() {
        var t = this, e = arguments;
        return new Promise(function(r, o) {
          var a = n.apply(t, e);
          function _next(n2) {
            asyncGeneratorStep(a, r, o, _next, _throw, "next", n2);
          }
          function _throw(n2) {
            asyncGeneratorStep(a, r, o, _next, _throw, "throw", n2);
          }
          _next(void 0);
        });
      };
    }
    function ensureDir(_x) {
      return _ensureDir.apply(this, arguments);
    }
    function _ensureDir() {
      _ensureDir = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee(path) {
        return _regenerator().w(function(_context) {
          while (1) switch (_context.n) {
            case 0:
              _context.n = 1;
              return _fs["default"].promises.mkdir(path, {
                recursive: true
              });
            case 1:
              return _context.a(2);
          }
        }, _callee);
      }));
      return _ensureDir.apply(this, arguments);
    }
  }
});

// node_modules/unzipper-esm/dist/extract.js
var require_extract = __commonJS({
  "node_modules/unzipper-esm/dist/extract.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = Extract;
    var _fs = _interopRequireDefault(require("fs"));
    var _path = _interopRequireDefault(require("path"));
    var _stream = require("stream");
    var _DuplexStream = _interopRequireDefault(require_DuplexStream());
    var _parse = _interopRequireDefault(require_parse());
    var _ensureDir = _interopRequireDefault(require_ensureDir());
    function _interopRequireDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    function _regenerator() {
      var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag";
      function i(r2, n2, o2, i2) {
        var c2 = n2 && n2.prototype instanceof Generator ? n2 : Generator, u2 = Object.create(c2.prototype);
        return _regeneratorDefine2(u2, "_invoke", (function(r3, n3, o3) {
          var i3, c3, u3, f2 = 0, p = o3 || [], y = false, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d2(t2, r4) {
            return i3 = t2, c3 = 0, u3 = e, G.n = r4, a;
          } };
          function d(r4, n4) {
            for (c3 = r4, u3 = n4, t = 0; !y && f2 && !o4 && t < p.length; t++) {
              var o4, i4 = p[t], d2 = G.p, l = i4[2];
              r4 > 3 ? (o4 = l === n4) && (u3 = i4[(c3 = i4[4]) ? 5 : (c3 = 3, 3)], i4[4] = i4[5] = e) : i4[0] <= d2 && ((o4 = r4 < 2 && d2 < i4[1]) ? (c3 = 0, G.v = n4, G.n = i4[1]) : d2 < l && (o4 = r4 < 3 || i4[0] > n4 || n4 > l) && (i4[4] = r4, i4[5] = n4, G.n = l, c3 = 0));
            }
            if (o4 || r4 > 1) return a;
            throw y = true, n4;
          }
          return function(o4, p2, l) {
            if (f2 > 1) throw TypeError("Generator is already running");
            for (y && 1 === p2 && d(p2, l), c3 = p2, u3 = l; (t = c3 < 2 ? e : u3) || !y; ) {
              i3 || (c3 ? c3 < 3 ? (c3 > 1 && (G.n = -1), d(c3, u3)) : G.n = u3 : G.v = u3);
              try {
                if (f2 = 2, i3) {
                  if (c3 || (o4 = "next"), t = i3[o4]) {
                    if (!(t = t.call(i3, u3))) throw TypeError("iterator result is not an object");
                    if (!t.done) return t;
                    u3 = t.value, c3 < 2 && (c3 = 0);
                  } else 1 === c3 && (t = i3["return"]) && t.call(i3), c3 < 2 && (u3 = TypeError("The iterator does not provide a '" + o4 + "' method"), c3 = 1);
                  i3 = e;
                } else if ((t = (y = G.n < 0) ? u3 : r3.call(n3, G)) !== a) break;
              } catch (t2) {
                i3 = e, c3 = 1, u3 = t2;
              } finally {
                f2 = 1;
              }
            }
            return { value: t, done: y };
          };
        })(r2, o2, i2), true), u2;
      }
      var a = {};
      function Generator() {
      }
      function GeneratorFunction() {
      }
      function GeneratorFunctionPrototype() {
      }
      t = Object.getPrototypeOf;
      var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function() {
        return this;
      }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c);
      function f(e2) {
        return Object.setPrototypeOf ? Object.setPrototypeOf(e2, GeneratorFunctionPrototype) : (e2.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e2, o, "GeneratorFunction")), e2.prototype = Object.create(u), e2;
      }
      return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function() {
        return this;
      }), _regeneratorDefine2(u, "toString", function() {
        return "[object Generator]";
      }), (_regenerator = function _regenerator2() {
        return { w: i, m: f };
      })();
    }
    function _regeneratorDefine2(e, r, n, t) {
      var i = Object.defineProperty;
      try {
        i({}, "", {});
      } catch (e2) {
        i = 0;
      }
      _regeneratorDefine2 = function _regeneratorDefine(e2, r2, n2, t2) {
        function o(r3, n3) {
          _regeneratorDefine2(e2, r3, function(e3) {
            return this._invoke(r3, n3, e3);
          });
        }
        r2 ? i ? i(e2, r2, { value: n2, enumerable: !t2, configurable: !t2, writable: !t2 }) : e2[r2] = n2 : (o("next", 0), o("throw", 1), o("return", 2));
      }, _regeneratorDefine2(e, r, n, t);
    }
    function asyncGeneratorStep(n, t, e, r, o, a, c) {
      try {
        var i = n[a](c), u = i.value;
      } catch (n2) {
        return void e(n2);
      }
      i.done ? t(u) : Promise.resolve(u).then(r, o);
    }
    function _asyncToGenerator(n) {
      return function() {
        var t = this, e = arguments;
        return new Promise(function(r, o) {
          var a = n.apply(t, e);
          function _next(n2) {
            asyncGeneratorStep(a, r, o, _next, _throw, "next", n2);
          }
          function _throw(n2) {
            asyncGeneratorStep(a, r, o, _next, _throw, "throw", n2);
          }
          _next(void 0);
        });
      };
    }
    function Extract(opts) {
      opts.path = _path["default"].resolve(_path["default"].normalize(opts.path));
      var parser = (0, _parse["default"])(opts);
      var outStream = new _stream.Writable({
        objectMode: true,
        write
      });
      function write(_x, _x2, _x3) {
        return _write.apply(this, arguments);
      }
      function _write() {
        _write = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee(entry, encoding, cb) {
          var extractPath, rel, writer;
          return _regenerator().w(function(_context) {
            while (1) switch (_context.n) {
              case 0:
                extractPath = _path["default"].join(opts.path, entry.path.replace(/\\/g, "/"));
                rel = _path["default"].relative(opts.path, extractPath);
                if (!(rel === "" || rel.startsWith("..") || _path["default"].isAbsolute(rel))) {
                  _context.n = 1;
                  break;
                }
                return _context.a(2, cb());
              case 1:
                if (!(entry.type == "Directory")) {
                  _context.n = 3;
                  break;
                }
                _context.n = 2;
                return (0, _ensureDir["default"])(extractPath);
              case 2:
                return _context.a(2, cb());
              case 3:
                _context.n = 4;
                return (0, _ensureDir["default"])(_path["default"].dirname(extractPath));
              case 4:
                writer = opts.getWriter ? opts.getWriter({
                  path: extractPath
                }) : _fs["default"].createWriteStream(extractPath);
                entry.pipe(writer).on("error", cb).on("close", cb);
              case 5:
                return _context.a(2);
            }
          }, _callee);
        }));
        return _write.apply(this, arguments);
      }
      ;
      var extract = new _DuplexStream["default"](parser, outStream);
      parser.once("crx-header", function(crxHeader) {
        extract.crxHeader = crxHeader;
      });
      parser.pipe(outStream).on("finish", function() {
        extract.emit("close");
      });
      extract.promise = function() {
        return new Promise(function(resolve, reject) {
          extract.on("close", resolve);
          extract.on("error", reject);
        });
      };
      return extract;
    }
  }
});

// node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS({
  "node_modules/graceful-fs/polyfills.js"(exports2, module2) {
    var constants = require("constants");
    var origCwd = process.cwd;
    var cwd = null;
    var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
    process.cwd = function() {
      if (!cwd)
        cwd = origCwd.call(process);
      return cwd;
    };
    try {
      process.cwd();
    } catch (er) {
    }
    if (typeof process.chdir === "function") {
      chdir = process.chdir;
      process.chdir = function(d) {
        cwd = null;
        chdir.call(process, d);
      };
      if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
    }
    var chdir;
    module2.exports = patch;
    function patch(fs) {
      if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
        patchLchmod(fs);
      }
      if (!fs.lutimes) {
        patchLutimes(fs);
      }
      fs.chown = chownFix(fs.chown);
      fs.fchown = chownFix(fs.fchown);
      fs.lchown = chownFix(fs.lchown);
      fs.chmod = chmodFix(fs.chmod);
      fs.fchmod = chmodFix(fs.fchmod);
      fs.lchmod = chmodFix(fs.lchmod);
      fs.chownSync = chownFixSync(fs.chownSync);
      fs.fchownSync = chownFixSync(fs.fchownSync);
      fs.lchownSync = chownFixSync(fs.lchownSync);
      fs.chmodSync = chmodFixSync(fs.chmodSync);
      fs.fchmodSync = chmodFixSync(fs.fchmodSync);
      fs.lchmodSync = chmodFixSync(fs.lchmodSync);
      fs.stat = statFix(fs.stat);
      fs.fstat = statFix(fs.fstat);
      fs.lstat = statFix(fs.lstat);
      fs.statSync = statFixSync(fs.statSync);
      fs.fstatSync = statFixSync(fs.fstatSync);
      fs.lstatSync = statFixSync(fs.lstatSync);
      if (fs.chmod && !fs.lchmod) {
        fs.lchmod = function(path, mode, cb) {
          if (cb) process.nextTick(cb);
        };
        fs.lchmodSync = function() {
        };
      }
      if (fs.chown && !fs.lchown) {
        fs.lchown = function(path, uid, gid, cb) {
          if (cb) process.nextTick(cb);
        };
        fs.lchownSync = function() {
        };
      }
      if (platform === "win32") {
        fs.rename = typeof fs.rename !== "function" ? fs.rename : (function(fs$rename) {
          function rename(from, to, cb) {
            var start = Date.now();
            var backoff = 0;
            fs$rename(from, to, function CB(er) {
              if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
                setTimeout(function() {
                  fs.stat(to, function(stater, st) {
                    if (stater && stater.code === "ENOENT")
                      fs$rename(from, to, CB);
                    else
                      cb(er);
                  });
                }, backoff);
                if (backoff < 100)
                  backoff += 10;
                return;
              }
              if (cb) cb(er);
            });
          }
          if (Object.setPrototypeOf) Object.setPrototypeOf(rename, fs$rename);
          return rename;
        })(fs.rename);
      }
      fs.read = typeof fs.read !== "function" ? fs.read : (function(fs$read) {
        function read(fd, buffer, offset, length, position, callback_) {
          var callback;
          if (callback_ && typeof callback_ === "function") {
            var eagCounter = 0;
            callback = function(er, _, __) {
              if (er && er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                return fs$read.call(fs, fd, buffer, offset, length, position, callback);
              }
              callback_.apply(this, arguments);
            };
          }
          return fs$read.call(fs, fd, buffer, offset, length, position, callback);
        }
        if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
        return read;
      })(fs.read);
      fs.readSync = typeof fs.readSync !== "function" ? fs.readSync : /* @__PURE__ */ (function(fs$readSync) {
        return function(fd, buffer, offset, length, position) {
          var eagCounter = 0;
          while (true) {
            try {
              return fs$readSync.call(fs, fd, buffer, offset, length, position);
            } catch (er) {
              if (er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                continue;
              }
              throw er;
            }
          }
        };
      })(fs.readSync);
      function patchLchmod(fs2) {
        fs2.lchmod = function(path, mode, callback) {
          fs2.open(
            path,
            constants.O_WRONLY | constants.O_SYMLINK,
            mode,
            function(err, fd) {
              if (err) {
                if (callback) callback(err);
                return;
              }
              fs2.fchmod(fd, mode, function(err2) {
                fs2.close(fd, function(err22) {
                  if (callback) callback(err2 || err22);
                });
              });
            }
          );
        };
        fs2.lchmodSync = function(path, mode) {
          var fd = fs2.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode);
          var threw = true;
          var ret;
          try {
            ret = fs2.fchmodSync(fd, mode);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs2.closeSync(fd);
              } catch (er) {
              }
            } else {
              fs2.closeSync(fd);
            }
          }
          return ret;
        };
      }
      function patchLutimes(fs2) {
        if (constants.hasOwnProperty("O_SYMLINK") && fs2.futimes) {
          fs2.lutimes = function(path, at, mt, cb) {
            fs2.open(path, constants.O_SYMLINK, function(er, fd) {
              if (er) {
                if (cb) cb(er);
                return;
              }
              fs2.futimes(fd, at, mt, function(er2) {
                fs2.close(fd, function(er22) {
                  if (cb) cb(er2 || er22);
                });
              });
            });
          };
          fs2.lutimesSync = function(path, at, mt) {
            var fd = fs2.openSync(path, constants.O_SYMLINK);
            var ret;
            var threw = true;
            try {
              ret = fs2.futimesSync(fd, at, mt);
              threw = false;
            } finally {
              if (threw) {
                try {
                  fs2.closeSync(fd);
                } catch (er) {
                }
              } else {
                fs2.closeSync(fd);
              }
            }
            return ret;
          };
        } else if (fs2.futimes) {
          fs2.lutimes = function(_a, _b, _c, cb) {
            if (cb) process.nextTick(cb);
          };
          fs2.lutimesSync = function() {
          };
        }
      }
      function chmodFix(orig) {
        if (!orig) return orig;
        return function(target, mode, cb) {
          return orig.call(fs, target, mode, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chmodFixSync(orig) {
        if (!orig) return orig;
        return function(target, mode) {
          try {
            return orig.call(fs, target, mode);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function chownFix(orig) {
        if (!orig) return orig;
        return function(target, uid, gid, cb) {
          return orig.call(fs, target, uid, gid, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chownFixSync(orig) {
        if (!orig) return orig;
        return function(target, uid, gid) {
          try {
            return orig.call(fs, target, uid, gid);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function statFix(orig) {
        if (!orig) return orig;
        return function(target, options, cb) {
          if (typeof options === "function") {
            cb = options;
            options = null;
          }
          function callback(er, stats) {
            if (stats) {
              if (stats.uid < 0) stats.uid += 4294967296;
              if (stats.gid < 0) stats.gid += 4294967296;
            }
            if (cb) cb.apply(this, arguments);
          }
          return options ? orig.call(fs, target, options, callback) : orig.call(fs, target, callback);
        };
      }
      function statFixSync(orig) {
        if (!orig) return orig;
        return function(target, options) {
          var stats = options ? orig.call(fs, target, options) : orig.call(fs, target);
          if (stats) {
            if (stats.uid < 0) stats.uid += 4294967296;
            if (stats.gid < 0) stats.gid += 4294967296;
          }
          return stats;
        };
      }
      function chownErOk(er) {
        if (!er)
          return true;
        if (er.code === "ENOSYS")
          return true;
        var nonroot = !process.getuid || process.getuid() !== 0;
        if (nonroot) {
          if (er.code === "EINVAL" || er.code === "EPERM")
            return true;
        }
        return false;
      }
    }
  }
});

// node_modules/graceful-fs/legacy-streams.js
var require_legacy_streams = __commonJS({
  "node_modules/graceful-fs/legacy-streams.js"(exports2, module2) {
    var Stream = require("stream").Stream;
    module2.exports = legacy;
    function legacy(fs) {
      return {
        ReadStream,
        WriteStream
      };
      function ReadStream(path, options) {
        if (!(this instanceof ReadStream)) return new ReadStream(path, options);
        Stream.call(this);
        var self = this;
        this.path = path;
        this.fd = null;
        this.readable = true;
        this.paused = false;
        this.flags = "r";
        this.mode = 438;
        this.bufferSize = 64 * 1024;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.encoding) this.setEncoding(this.encoding);
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.end === void 0) {
            this.end = Infinity;
          } else if ("number" !== typeof this.end) {
            throw TypeError("end must be a Number");
          }
          if (this.start > this.end) {
            throw new Error("start must be <= end");
          }
          this.pos = this.start;
        }
        if (this.fd !== null) {
          process.nextTick(function() {
            self._read();
          });
          return;
        }
        fs.open(this.path, this.flags, this.mode, function(err, fd) {
          if (err) {
            self.emit("error", err);
            self.readable = false;
            return;
          }
          self.fd = fd;
          self.emit("open", fd);
          self._read();
        });
      }
      function WriteStream(path, options) {
        if (!(this instanceof WriteStream)) return new WriteStream(path, options);
        Stream.call(this);
        this.path = path;
        this.fd = null;
        this.writable = true;
        this.flags = "w";
        this.encoding = "binary";
        this.mode = 438;
        this.bytesWritten = 0;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.start < 0) {
            throw new Error("start must be >= zero");
          }
          this.pos = this.start;
        }
        this.busy = false;
        this._queue = [];
        if (this.fd === null) {
          this._open = fs.open;
          this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
          this.flush();
        }
      }
    }
  }
});

// node_modules/graceful-fs/clone.js
var require_clone = __commonJS({
  "node_modules/graceful-fs/clone.js"(exports2, module2) {
    "use strict";
    module2.exports = clone;
    var getPrototypeOf = Object.getPrototypeOf || function(obj) {
      return obj.__proto__;
    };
    function clone(obj) {
      if (obj === null || typeof obj !== "object")
        return obj;
      if (obj instanceof Object)
        var copy = { __proto__: getPrototypeOf(obj) };
      else
        var copy = /* @__PURE__ */ Object.create(null);
      Object.getOwnPropertyNames(obj).forEach(function(key) {
        Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
      });
      return copy;
    }
  }
});

// node_modules/graceful-fs/graceful-fs.js
var require_graceful_fs = __commonJS({
  "node_modules/graceful-fs/graceful-fs.js"(exports2, module2) {
    var fs = require("fs");
    var polyfills = require_polyfills();
    var legacy = require_legacy_streams();
    var clone = require_clone();
    var util = require("util");
    var gracefulQueue;
    var previousSymbol;
    if (typeof Symbol === "function" && typeof Symbol.for === "function") {
      gracefulQueue = /* @__PURE__ */ Symbol.for("graceful-fs.queue");
      previousSymbol = /* @__PURE__ */ Symbol.for("graceful-fs.previous");
    } else {
      gracefulQueue = "___graceful-fs.queue";
      previousSymbol = "___graceful-fs.previous";
    }
    function noop() {
    }
    function publishQueue(context, queue2) {
      Object.defineProperty(context, gracefulQueue, {
        get: function() {
          return queue2;
        }
      });
    }
    var debug = noop;
    if (util.debuglog)
      debug = util.debuglog("gfs4");
    else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
      debug = function() {
        var m = util.format.apply(util, arguments);
        m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
        console.error(m);
      };
    if (!fs[gracefulQueue]) {
      queue = global[gracefulQueue] || [];
      publishQueue(fs, queue);
      fs.close = (function(fs$close) {
        function close(fd, cb) {
          return fs$close.call(fs, fd, function(err) {
            if (!err) {
              resetQueue();
            }
            if (typeof cb === "function")
              cb.apply(this, arguments);
          });
        }
        Object.defineProperty(close, previousSymbol, {
          value: fs$close
        });
        return close;
      })(fs.close);
      fs.closeSync = (function(fs$closeSync) {
        function closeSync(fd) {
          fs$closeSync.apply(fs, arguments);
          resetQueue();
        }
        Object.defineProperty(closeSync, previousSymbol, {
          value: fs$closeSync
        });
        return closeSync;
      })(fs.closeSync);
      if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
        process.on("exit", function() {
          debug(fs[gracefulQueue]);
          require("assert").equal(fs[gracefulQueue].length, 0);
        });
      }
    }
    var queue;
    if (!global[gracefulQueue]) {
      publishQueue(global, fs[gracefulQueue]);
    }
    module2.exports = patch(clone(fs));
    if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched) {
      module2.exports = patch(fs);
      fs.__patched = true;
    }
    function patch(fs2) {
      polyfills(fs2);
      fs2.gracefulify = patch;
      fs2.createReadStream = createReadStream;
      fs2.createWriteStream = createWriteStream;
      var fs$readFile = fs2.readFile;
      fs2.readFile = readFile;
      function readFile(path, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$readFile(path, options, cb);
        function go$readFile(path2, options2, cb2, startTime) {
          return fs$readFile(path2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$readFile, [path2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$writeFile = fs2.writeFile;
      fs2.writeFile = writeFile;
      function writeFile(path, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$writeFile(path, data, options, cb);
        function go$writeFile(path2, data2, options2, cb2, startTime) {
          return fs$writeFile(path2, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$writeFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$appendFile = fs2.appendFile;
      if (fs$appendFile)
        fs2.appendFile = appendFile;
      function appendFile(path, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$appendFile(path, data, options, cb);
        function go$appendFile(path2, data2, options2, cb2, startTime) {
          return fs$appendFile(path2, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$appendFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$copyFile = fs2.copyFile;
      if (fs$copyFile)
        fs2.copyFile = copyFile;
      function copyFile(src, dest, flags, cb) {
        if (typeof flags === "function") {
          cb = flags;
          flags = 0;
        }
        return go$copyFile(src, dest, flags, cb);
        function go$copyFile(src2, dest2, flags2, cb2, startTime) {
          return fs$copyFile(src2, dest2, flags2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$readdir = fs2.readdir;
      fs2.readdir = readdir;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir(path, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path2, options2, cb2, startTime) {
          return fs$readdir(path2, fs$readdirCallback(
            path2,
            options2,
            cb2,
            startTime
          ));
        } : function go$readdir2(path2, options2, cb2, startTime) {
          return fs$readdir(path2, options2, fs$readdirCallback(
            path2,
            options2,
            cb2,
            startTime
          ));
        };
        return go$readdir(path, options, cb);
        function fs$readdirCallback(path2, options2, cb2, startTime) {
          return function(err, files) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([
                go$readdir,
                [path2, options2, cb2],
                err,
                startTime || Date.now(),
                Date.now()
              ]);
            else {
              if (files && files.sort)
                files.sort();
              if (typeof cb2 === "function")
                cb2.call(this, err, files);
            }
          };
        }
      }
      if (process.version.substr(0, 4) === "v0.8") {
        var legStreams = legacy(fs2);
        ReadStream = legStreams.ReadStream;
        WriteStream = legStreams.WriteStream;
      }
      var fs$ReadStream = fs2.ReadStream;
      if (fs$ReadStream) {
        ReadStream.prototype = Object.create(fs$ReadStream.prototype);
        ReadStream.prototype.open = ReadStream$open;
      }
      var fs$WriteStream = fs2.WriteStream;
      if (fs$WriteStream) {
        WriteStream.prototype = Object.create(fs$WriteStream.prototype);
        WriteStream.prototype.open = WriteStream$open;
      }
      Object.defineProperty(fs2, "ReadStream", {
        get: function() {
          return ReadStream;
        },
        set: function(val) {
          ReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(fs2, "WriteStream", {
        get: function() {
          return WriteStream;
        },
        set: function(val) {
          WriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileReadStream = ReadStream;
      Object.defineProperty(fs2, "FileReadStream", {
        get: function() {
          return FileReadStream;
        },
        set: function(val) {
          FileReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileWriteStream = WriteStream;
      Object.defineProperty(fs2, "FileWriteStream", {
        get: function() {
          return FileWriteStream;
        },
        set: function(val) {
          FileWriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      function ReadStream(path, options) {
        if (this instanceof ReadStream)
          return fs$ReadStream.apply(this, arguments), this;
        else
          return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
      }
      function ReadStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            if (that.autoClose)
              that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
            that.read();
          }
        });
      }
      function WriteStream(path, options) {
        if (this instanceof WriteStream)
          return fs$WriteStream.apply(this, arguments), this;
        else
          return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
      }
      function WriteStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
          }
        });
      }
      function createReadStream(path, options) {
        return new fs2.ReadStream(path, options);
      }
      function createWriteStream(path, options) {
        return new fs2.WriteStream(path, options);
      }
      var fs$open = fs2.open;
      fs2.open = open;
      function open(path, flags, mode, cb) {
        if (typeof mode === "function")
          cb = mode, mode = null;
        return go$open(path, flags, mode, cb);
        function go$open(path2, flags2, mode2, cb2, startTime) {
          return fs$open(path2, flags2, mode2, function(err, fd) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$open, [path2, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      return fs2;
    }
    function enqueue(elem) {
      debug("ENQUEUE", elem[0].name, elem[1]);
      fs[gracefulQueue].push(elem);
      retry();
    }
    var retryTimer;
    function resetQueue() {
      var now = Date.now();
      for (var i = 0; i < fs[gracefulQueue].length; ++i) {
        if (fs[gracefulQueue][i].length > 2) {
          fs[gracefulQueue][i][3] = now;
          fs[gracefulQueue][i][4] = now;
        }
      }
      retry();
    }
    function retry() {
      clearTimeout(retryTimer);
      retryTimer = void 0;
      if (fs[gracefulQueue].length === 0)
        return;
      var elem = fs[gracefulQueue].shift();
      var fn = elem[0];
      var args = elem[1];
      var err = elem[2];
      var startTime = elem[3];
      var lastTime = elem[4];
      if (startTime === void 0) {
        debug("RETRY", fn.name, args);
        fn.apply(null, args);
      } else if (Date.now() - startTime >= 6e4) {
        debug("TIMEOUT", fn.name, args);
        var cb = args.pop();
        if (typeof cb === "function")
          cb.call(null, err);
      } else {
        var sinceAttempt = Date.now() - lastTime;
        var sinceStart = Math.max(lastTime - startTime, 1);
        var desiredDelay = Math.min(sinceStart * 1.2, 100);
        if (sinceAttempt >= desiredDelay) {
          debug("RETRY", fn.name, args);
          fn.apply(null, args.concat([startTime]));
        } else {
          fs[gracefulQueue].push(elem);
        }
      }
      if (retryTimer === void 0) {
        retryTimer = setTimeout(retry, 0);
      }
    }
  }
});

// node_modules/node-int64/Int64.js
var require_Int64 = __commonJS({
  "node_modules/node-int64/Int64.js"(exports2, module2) {
    var VAL32 = 4294967296;
    var _HEX = [];
    for (i = 0; i < 256; i++) {
      _HEX[i] = (i > 15 ? "" : "0") + i.toString(16);
    }
    var i;
    var Int64 = module2.exports = function(a1, a2) {
      if (a1 instanceof Buffer) {
        this.buffer = a1;
        this.offset = a2 || 0;
      } else if (Object.prototype.toString.call(a1) == "[object Uint8Array]") {
        this.buffer = new Buffer(a1);
        this.offset = a2 || 0;
      } else {
        this.buffer = this.buffer || new Buffer(8);
        this.offset = 0;
        this.setValue.apply(this, arguments);
      }
    };
    Int64.MAX_INT = Math.pow(2, 53);
    Int64.MIN_INT = -Math.pow(2, 53);
    Int64.prototype = {
      constructor: Int64,
      /**
       * Do in-place 2's compliment.  See
       * http://en.wikipedia.org/wiki/Two's_complement
       */
      _2scomp: function() {
        var b = this.buffer, o = this.offset, carry = 1;
        for (var i2 = o + 7; i2 >= o; i2--) {
          var v = (b[i2] ^ 255) + carry;
          b[i2] = v & 255;
          carry = v >> 8;
        }
      },
      /**
       * Set the value. Takes any of the following arguments:
       *
       * setValue(string) - A hexidecimal string
       * setValue(number) - Number (throws if n is outside int64 range)
       * setValue(hi, lo) - Raw bits as two 32-bit values
       */
      setValue: function(hi, lo) {
        var negate = false;
        if (arguments.length == 1) {
          if (typeof hi == "number") {
            negate = hi < 0;
            hi = Math.abs(hi);
            lo = hi % VAL32;
            hi = hi / VAL32;
            if (hi > VAL32) throw new RangeError(hi + " is outside Int64 range");
            hi = hi | 0;
          } else if (typeof hi == "string") {
            hi = (hi + "").replace(/^0x/, "");
            lo = hi.substr(-8);
            hi = hi.length > 8 ? hi.substr(0, hi.length - 8) : "";
            hi = parseInt(hi, 16);
            lo = parseInt(lo, 16);
          } else {
            throw new Error(hi + " must be a Number or String");
          }
        }
        var b = this.buffer, o = this.offset;
        for (var i2 = 7; i2 >= 0; i2--) {
          b[o + i2] = lo & 255;
          lo = i2 == 4 ? hi : lo >>> 8;
        }
        if (negate) this._2scomp();
      },
      /**
       * Convert to a native JS number.
       *
       * WARNING: Do not expect this value to be accurate to integer precision for
       * large (positive or negative) numbers!
       *
       * @param allowImprecise If true, no check is performed to verify the
       * returned value is accurate to integer precision.  If false, imprecise
       * numbers (very large positive or negative numbers) will be forced to +/-
       * Infinity.
       */
      toNumber: function(allowImprecise) {
        var b = this.buffer, o = this.offset;
        var negate = b[o] & 128, x = 0, carry = 1;
        for (var i2 = 7, m = 1; i2 >= 0; i2--, m *= 256) {
          var v = b[o + i2];
          if (negate) {
            v = (v ^ 255) + carry;
            carry = v >> 8;
            v = v & 255;
          }
          x += v * m;
        }
        if (!allowImprecise && x >= Int64.MAX_INT) {
          return negate ? -Infinity : Infinity;
        }
        return negate ? -x : x;
      },
      /**
       * Convert to a JS Number. Returns +/-Infinity for values that can't be
       * represented to integer precision.
       */
      valueOf: function() {
        return this.toNumber(false);
      },
      /**
       * Return string value
       *
       * @param radix Just like Number#toString()'s radix
       */
      toString: function(radix) {
        return this.valueOf().toString(radix || 10);
      },
      /**
       * Return a string showing the buffer octets, with MSB on the left.
       *
       * @param sep separator string. default is '' (empty string)
       */
      toOctetString: function(sep) {
        var out = new Array(8);
        var b = this.buffer, o = this.offset;
        for (var i2 = 0; i2 < 8; i2++) {
          out[i2] = _HEX[b[o + i2]];
        }
        return out.join(sep || "");
      },
      /**
       * Returns the int64's 8 bytes in a buffer.
       *
       * @param {bool} [rawBuffer=false]  If no offset and this is true, return the internal buffer.  Should only be used if
       *                                  you're discarding the Int64 afterwards, as it breaks encapsulation.
       */
      toBuffer: function(rawBuffer) {
        if (rawBuffer && this.offset === 0) return this.buffer;
        var out = new Buffer(8);
        this.buffer.copy(out, 0, this.offset, this.offset + 8);
        return out;
      },
      /**
       * Copy 8 bytes of int64 into target buffer at target offset.
       *
       * @param {Buffer} targetBuffer       Buffer to copy into.
       * @param {number} [targetOffset=0]   Offset into target buffer.
       */
      copy: function(targetBuffer, targetOffset) {
        this.buffer.copy(targetBuffer, targetOffset || 0, this.offset, this.offset + 8);
      },
      /**
       * Returns a number indicating whether this comes before or after or is the
       * same as the other in sort order.
       *
       * @param {Int64} other  Other Int64 to compare.
       */
      compare: function(other) {
        if ((this.buffer[this.offset] & 128) != (other.buffer[other.offset] & 128)) {
          return other.buffer[other.offset] - this.buffer[this.offset];
        }
        for (var i2 = 0; i2 < 8; i2++) {
          if (this.buffer[this.offset + i2] !== other.buffer[other.offset + i2]) {
            return this.buffer[this.offset + i2] - other.buffer[other.offset + i2];
          }
        }
        return 0;
      },
      /**
       * Returns a boolean indicating if this integer is equal to other.
       *
       * @param {Int64} other  Other Int64 to compare.
       */
      equals: function(other) {
        return this.compare(other) === 0;
      },
      /**
       * Pretty output in console.log
       */
      inspect: function() {
        return "[Int64 value:" + this + " octets:" + this.toOctetString(" ") + "]";
      }
    };
  }
});

// node_modules/unzipper-esm/dist/Decrypt.js
var require_Decrypt = __commonJS({
  "node_modules/unzipper-esm/dist/Decrypt.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = void 0;
    var _nodeInt = _interopRequireDefault(require_Int64());
    var _stream2 = require("stream");
    function _interopRequireDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    function _classCallCheck(a, n) {
      if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
    }
    function _defineProperties(e, r) {
      for (var t = 0; t < r.length; t++) {
        var o = r[t];
        o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey(o.key), o);
      }
    }
    function _createClass(e, r, t) {
      return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: false }), e;
    }
    function _toPropertyKey(t) {
      var i = _toPrimitive(t, "string");
      return "symbol" == _typeof(i) ? i : i + "";
    }
    function _toPrimitive(t, r) {
      if ("object" != _typeof(t) || !t) return t;
      var e = t[Symbol.toPrimitive];
      if (void 0 !== e) {
        var i = e.call(t, r || "default");
        if ("object" != _typeof(i)) return i;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return ("string" === r ? String : Number)(t);
    }
    var table;
    function generateTable() {
      var poly = 3988292384;
      var c, n, k;
      table = [];
      for (n = 0; n < 256; n++) {
        c = n;
        for (k = 0; k < 8; k++) c = c & 1 ? poly ^ c >>> 1 : c = c >>> 1;
        table[n] = c >>> 0;
      }
    }
    function crc(ch, crc2) {
      if (!table) generateTable();
      if (ch.charCodeAt) ch = ch.charCodeAt(0);
      var l = crc2.readUInt32BE() >> 8 & 16777215;
      var r = table[(crc2.readUInt32BE() ^ ch >>> 0) & 255];
      return (l ^ r) >>> 0;
    }
    function multiply(a, b) {
      var ah = a >> 16 & 65535;
      var al = a & 65535;
      var bh = b >> 16 & 65535;
      var bl = b & 65535;
      var high = ah * bl + al * bh & 65535;
      return (high << 16 >>> 0) + al * bl;
    }
    var DecryptConstructor = function DecryptConstructor2() {
      this.key0 = Buffer.allocUnsafe(4);
      this.key1 = Buffer.allocUnsafe(4);
      this.key2 = Buffer.allocUnsafe(4);
      this.key0.writeUInt32BE(305419896, 0);
      this.key1.writeUInt32BE(591751049, 0);
      this.key2.writeUInt32BE(878082192, 0);
    };
    var _update = function update(h) {
      this.key0.writeUInt32BE(crc(h, this.key0));
      this.key1.writeUInt32BE((this.key0.readUInt32BE() & 255 & 4294967295) + this.key1.readUInt32BE() >>> 0);
      var x = new _nodeInt["default"](multiply(this.key1.readUInt32BE(), 134775813) + 1 & 4294967295);
      var b = Buffer.alloc(8);
      x.copy(b, 0);
      b.copy(this.key1, 0, 4, 8);
      this.key2.writeUInt32BE(crc((this.key1.readUInt32BE() >> 24 & 255) >>> 0, this.key2));
    };
    var _decryptByte = function decryptByte(c) {
      var k = (this.key2.readUInt32BE() | 2) >>> 0;
      c = c ^ multiply(k, k ^ 1 >>> 0) >> 8 & 255;
      this.update(c);
      return c;
    };
    var _stream = function stream() {
      var self = this;
      var transform = function transform2(d, e, cb) {
        for (var i = 0; i < d.length; i++) {
          d[i] = self.decryptByte(d[i]);
        }
        this.push(d);
        cb();
      };
      return new _stream2.Transform({
        transform
      });
    };
    var Decrypt = exports2["default"] = /* @__PURE__ */ (function() {
      function Decrypt2() {
        _classCallCheck(this, Decrypt2);
        DecryptConstructor.call(this);
      }
      return _createClass(Decrypt2, [{
        key: "update",
        value: function update(h) {
          return _update.call(this, h);
        }
      }, {
        key: "decryptByte",
        value: function decryptByte(c) {
          return _decryptByte.call(this, c);
        }
      }, {
        key: "stream",
        value: function stream() {
          return _stream.call(this);
        }
      }]);
    })();
  }
});

// node_modules/unzipper-esm/dist/Open/unzip.js
var require_unzip = __commonJS({
  "node_modules/unzipper-esm/dist/Open/unzip.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = unzip;
    var _stream = require("stream");
    var _zlib = _interopRequireDefault(require("zlib"));
    var _Decrypt = _interopRequireDefault(require_Decrypt());
    var _PullStream = _interopRequireDefault(require_PullStream());
    var _parseExtraField = _interopRequireDefault(require_parseExtraField());
    var _parseDateTime = _interopRequireDefault(require_parseDateTime());
    var _parseBuffer = _interopRequireDefault(require_parseBuffer());
    var _ZipFileError = require_ZipFileError();
    function _interopRequireDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    function unzip(source, offset, _password, directoryVars, length) {
      var file = new _PullStream["default"](), entry = new _stream.PassThrough();
      var req = source.stream(offset, length);
      req.pipe(file).on("error", function(e) {
        entry.emit("error", e);
      });
      entry.vars = file.pull(30).then(function(data) {
        var vars = (0, _parseBuffer["default"])(data, [["signature", 4], ["versionsNeededToExtract", 2], ["flags", 2], ["compressionMethod", 2], ["lastModifiedTime", 2], ["lastModifiedDate", 2], ["crc32", 4], ["compressedSize", 4], ["uncompressedSize", 4], ["fileNameLength", 2], ["extraFieldLength", 2]]);
        vars.lastModifiedDateTime = (0, _parseDateTime["default"])(vars.lastModifiedDate, vars.lastModifiedTime);
        return file.pull(vars.fileNameLength).then(function(fileName) {
          vars.fileName = fileName.toString("utf8");
          return file.pull(vars.extraFieldLength);
        }).then(function(extraField) {
          var checkEncryption;
          vars.extra = (0, _parseExtraField["default"])(extraField, vars);
          if (directoryVars && directoryVars.compressedSize) vars = directoryVars;
          if (vars.flags & 1) checkEncryption = file.pull(12).then(function(header) {
            if (!_password) throw new Error("MISSING_PASSWORD");
            var decrypt = new _Decrypt["default"]();
            String(_password).split("").forEach(function(d) {
              decrypt.update(d);
            });
            for (var i = 0; i < header.length; i++) header[i] = decrypt.decryptByte(header[i]);
            vars.decrypt = decrypt;
            vars.compressedSize -= 12;
            var check = vars.flags & 8 ? vars.lastModifiedTime >> 8 & 255 : vars.crc32 >> 24 & 255;
            if (header[11] !== check) throw new Error("BAD_PASSWORD");
            return vars;
          });
          return Promise.resolve(checkEncryption).then(function() {
            entry.emit("vars", vars);
            return vars;
          });
        });
      });
      entry.vars.then(function(vars) {
        var fileSizeKnown = !(vars.flags & 8) || vars.compressedSize > 0;
        var eof;
        var inflater = vars.compressionMethod ? _zlib["default"].createInflateRaw() : new _stream.PassThrough();
        if (fileSizeKnown) {
          entry.size = vars.uncompressedSize;
          eof = vars.compressedSize;
        } else {
          eof = Buffer.alloc(4);
          eof.writeUInt32LE(134695760, 0);
        }
        var stream = file.stream(eof);
        if (vars.decrypt) stream = stream.pipe(vars.decrypt.stream());
        stream.pipe(inflater).on("error", function(err) {
          if (err.code === "Z_DATA_ERROR") {
            err = (0, _ZipFileError.createZipFileError)(err);
          }
          entry.emit("error", err);
        }).pipe(entry).on("finish", function() {
          if (req.destroy) req.destroy();
          else if (req.abort) req.abort();
          else if (req.close) req.close();
          else if (req.push) req.push();
          else console.log("warning - unable to close stream");
        });
      })["catch"](function(e) {
        entry.emit("error", e);
      });
      return entry;
    }
  }
});

// node_modules/unzipper-esm/dist/mapPromises.js
var require_mapPromises = __commonJS({
  "node_modules/unzipper-esm/dist/mapPromises.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = pMap;
    function _regenerator() {
      var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag";
      function i(r2, n2, o2, i2) {
        var c2 = n2 && n2.prototype instanceof Generator ? n2 : Generator, u2 = Object.create(c2.prototype);
        return _regeneratorDefine2(u2, "_invoke", (function(r3, n3, o3) {
          var i3, c3, u3, f2 = 0, p = o3 || [], y = false, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d2(t2, r4) {
            return i3 = t2, c3 = 0, u3 = e, G.n = r4, a;
          } };
          function d(r4, n4) {
            for (c3 = r4, u3 = n4, t = 0; !y && f2 && !o4 && t < p.length; t++) {
              var o4, i4 = p[t], d2 = G.p, l = i4[2];
              r4 > 3 ? (o4 = l === n4) && (u3 = i4[(c3 = i4[4]) ? 5 : (c3 = 3, 3)], i4[4] = i4[5] = e) : i4[0] <= d2 && ((o4 = r4 < 2 && d2 < i4[1]) ? (c3 = 0, G.v = n4, G.n = i4[1]) : d2 < l && (o4 = r4 < 3 || i4[0] > n4 || n4 > l) && (i4[4] = r4, i4[5] = n4, G.n = l, c3 = 0));
            }
            if (o4 || r4 > 1) return a;
            throw y = true, n4;
          }
          return function(o4, p2, l) {
            if (f2 > 1) throw TypeError("Generator is already running");
            for (y && 1 === p2 && d(p2, l), c3 = p2, u3 = l; (t = c3 < 2 ? e : u3) || !y; ) {
              i3 || (c3 ? c3 < 3 ? (c3 > 1 && (G.n = -1), d(c3, u3)) : G.n = u3 : G.v = u3);
              try {
                if (f2 = 2, i3) {
                  if (c3 || (o4 = "next"), t = i3[o4]) {
                    if (!(t = t.call(i3, u3))) throw TypeError("iterator result is not an object");
                    if (!t.done) return t;
                    u3 = t.value, c3 < 2 && (c3 = 0);
                  } else 1 === c3 && (t = i3["return"]) && t.call(i3), c3 < 2 && (u3 = TypeError("The iterator does not provide a '" + o4 + "' method"), c3 = 1);
                  i3 = e;
                } else if ((t = (y = G.n < 0) ? u3 : r3.call(n3, G)) !== a) break;
              } catch (t2) {
                i3 = e, c3 = 1, u3 = t2;
              } finally {
                f2 = 1;
              }
            }
            return { value: t, done: y };
          };
        })(r2, o2, i2), true), u2;
      }
      var a = {};
      function Generator() {
      }
      function GeneratorFunction() {
      }
      function GeneratorFunctionPrototype() {
      }
      t = Object.getPrototypeOf;
      var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function() {
        return this;
      }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c);
      function f(e2) {
        return Object.setPrototypeOf ? Object.setPrototypeOf(e2, GeneratorFunctionPrototype) : (e2.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e2, o, "GeneratorFunction")), e2.prototype = Object.create(u), e2;
      }
      return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function() {
        return this;
      }), _regeneratorDefine2(u, "toString", function() {
        return "[object Generator]";
      }), (_regenerator = function _regenerator2() {
        return { w: i, m: f };
      })();
    }
    function _regeneratorDefine2(e, r, n, t) {
      var i = Object.defineProperty;
      try {
        i({}, "", {});
      } catch (e2) {
        i = 0;
      }
      _regeneratorDefine2 = function _regeneratorDefine(e2, r2, n2, t2) {
        function o(r3, n3) {
          _regeneratorDefine2(e2, r3, function(e3) {
            return this._invoke(r3, n3, e3);
          });
        }
        r2 ? i ? i(e2, r2, { value: n2, enumerable: !t2, configurable: !t2, writable: !t2 }) : e2[r2] = n2 : (o("next", 0), o("throw", 1), o("return", 2));
      }, _regeneratorDefine2(e, r, n, t);
    }
    function _slicedToArray(r, e) {
      return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
    }
    function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function _iterableToArrayLimit(r, l) {
      var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
      if (null != t) {
        var e, n, i, u, a = [], f = true, o = false;
        try {
          if (i = (t = t.call(r)).next, 0 === l) {
            if (Object(t) !== t) return;
            f = false;
          } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
        } catch (r2) {
          o = true, n = r2;
        } finally {
          try {
            if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return;
          } finally {
            if (o) throw n;
          }
        }
        return a;
      }
    }
    function _arrayWithHoles(r) {
      if (Array.isArray(r)) return r;
    }
    function _createForOfIteratorHelper(r, e) {
      var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
      if (!t) {
        if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) {
          t && (r = t);
          var _n = 0, F = function F2() {
          };
          return { s: F, n: function n() {
            return _n >= r.length ? { done: true } : { done: false, value: r[_n++] };
          }, e: function e2(r2) {
            throw r2;
          }, f: F };
        }
        throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
      }
      var o, a = true, u = false;
      return { s: function s() {
        t = t.call(r);
      }, n: function n() {
        var r2 = t.next();
        return a = r2.done, r2;
      }, e: function e2(r2) {
        u = true, o = r2;
      }, f: function f() {
        try {
          a || null == t["return"] || t["return"]();
        } finally {
          if (u) throw o;
        }
      } };
    }
    function _unsupportedIterableToArray(r, a) {
      if (r) {
        if ("string" == typeof r) return _arrayLikeToArray(r, a);
        var t = {}.toString.call(r).slice(8, -1);
        return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
      }
    }
    function _arrayLikeToArray(r, a) {
      (null == a || a > r.length) && (a = r.length);
      for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
      return n;
    }
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    function asyncGeneratorStep(n, t, e, r, o, a, c) {
      try {
        var i = n[a](c), u = i.value;
      } catch (n2) {
        return void e(n2);
      }
      i.done ? t(u) : Promise.resolve(u).then(r, o);
    }
    function _asyncToGenerator(n) {
      return function() {
        var t = this, e = arguments;
        return new Promise(function(r, o) {
          var a = n.apply(t, e);
          function _next(n2) {
            asyncGeneratorStep(a, r, o, _next, _throw, "next", n2);
          }
          function _throw(n2) {
            asyncGeneratorStep(a, r, o, _next, _throw, "throw", n2);
          }
          _next(void 0);
        });
      };
    }
    function pMap(_x, _x2) {
      return _pMap.apply(this, arguments);
    }
    function _pMap() {
      _pMap = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee4(iterable, mapper) {
        var _ref, _ref$concurrency, concurrency, _ref$stopOnError, stopOnError, _args4 = arguments;
        return _regenerator().w(function(_context4) {
          while (1) switch (_context4.n) {
            case 0:
              _ref = _args4.length > 2 && _args4[2] !== void 0 ? _args4[2] : {}, _ref$concurrency = _ref.concurrency, concurrency = _ref$concurrency === void 0 ? Number.POSITIVE_INFINITY : _ref$concurrency, _ref$stopOnError = _ref.stopOnError, stopOnError = _ref$stopOnError === void 0 ? true : _ref$stopOnError;
              return _context4.a(2, new Promise(function(resolve_, reject_) {
                if (iterable[Symbol.iterator] === void 0) {
                  throw new TypeError("Expected `input` to be an `Iterable`, got (".concat(_typeof(iterable), ")"));
                }
                if (typeof mapper !== "function") {
                  throw new TypeError("Mapper function is required");
                }
                if (!(Number.isSafeInteger(concurrency) && concurrency >= 1 || concurrency === Number.POSITIVE_INFINITY)) {
                  throw new TypeError("Expected `concurrency` to be an integer from 1 and up or `Infinity`, got `".concat(concurrency, "` (").concat(_typeof(concurrency), ")"));
                }
                var result = [];
                var errors = [];
                var skippedIndexesMap = /* @__PURE__ */ new Map();
                var isRejected = false;
                var isResolved = false;
                var isIterableDone = false;
                var resolvingCount = 0;
                var currentIndex = 0;
                var iterator = iterable[Symbol.iterator]();
                var cleanup = function cleanup2() {
                };
                var resolve = function resolve2(value) {
                  resolve_(value);
                  cleanup();
                };
                var reject = function reject2(reason) {
                  isRejected = true;
                  isResolved = true;
                  reject_(reason);
                  cleanup();
                };
                var _next2 = /* @__PURE__ */ (function() {
                  var _ref2 = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee2() {
                    var nextItem, index, pureResult, _iterator, _step, _step$value, _index, value, _t3;
                    return _regenerator().w(function(_context2) {
                      while (1) switch (_context2.p = _context2.n) {
                        case 0:
                          if (!isResolved) {
                            _context2.n = 1;
                            break;
                          }
                          return _context2.a(2);
                        case 1:
                          _context2.n = 2;
                          return iterator.next();
                        case 2:
                          nextItem = _context2.v;
                          index = currentIndex;
                          currentIndex++;
                          if (!nextItem.done) {
                            _context2.n = 14;
                            break;
                          }
                          isIterableDone = true;
                          if (!(resolvingCount === 0 && !isResolved)) {
                            _context2.n = 13;
                            break;
                          }
                          if (!(!stopOnError && errors.length > 0)) {
                            _context2.n = 3;
                            break;
                          }
                          reject(errors[0]);
                          return _context2.a(2);
                        case 3:
                          isResolved = true;
                          if (!(skippedIndexesMap.size === 0)) {
                            _context2.n = 4;
                            break;
                          }
                          resolve(result);
                          return _context2.a(2);
                        case 4:
                          pureResult = [];
                          _iterator = _createForOfIteratorHelper(result.entries());
                          _context2.p = 5;
                          _iterator.s();
                        case 6:
                          if ((_step = _iterator.n()).done) {
                            _context2.n = 9;
                            break;
                          }
                          _step$value = _slicedToArray(_step.value, 2), _index = _step$value[0], value = _step$value[1];
                          if (!(skippedIndexesMap.get(_index) === pMapSkip)) {
                            _context2.n = 7;
                            break;
                          }
                          return _context2.a(3, 8);
                        case 7:
                          pureResult.push(value);
                        case 8:
                          _context2.n = 6;
                          break;
                        case 9:
                          _context2.n = 11;
                          break;
                        case 10:
                          _context2.p = 10;
                          _t3 = _context2.v;
                          _iterator.e(_t3);
                        case 11:
                          _context2.p = 11;
                          _iterator.f();
                          return _context2.f(11);
                        case 12:
                          resolve(pureResult);
                        case 13:
                          return _context2.a(2);
                        case 14:
                          resolvingCount++;
                          _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee() {
                            var element, _value, _t, _t2;
                            return _regenerator().w(function(_context) {
                              while (1) switch (_context.p = _context.n) {
                                case 0:
                                  _context.p = 0;
                                  _context.n = 1;
                                  return nextItem.value;
                                case 1:
                                  element = _context.v;
                                  if (!isResolved) {
                                    _context.n = 2;
                                    break;
                                  }
                                  return _context.a(2);
                                case 2:
                                  _context.n = 3;
                                  return mapper(element, index);
                                case 3:
                                  _value = _context.v;
                                  if (_value === pMapSkip) {
                                    skippedIndexesMap.set(index, _value);
                                  }
                                  result[index] = _value;
                                  resolvingCount--;
                                  _context.n = 4;
                                  return _next2();
                                case 4:
                                  _context.n = 10;
                                  break;
                                case 5:
                                  _context.p = 5;
                                  _t = _context.v;
                                  if (!stopOnError) {
                                    _context.n = 6;
                                    break;
                                  }
                                  reject(_t);
                                  _context.n = 10;
                                  break;
                                case 6:
                                  errors.push(_t);
                                  resolvingCount--;
                                  _context.p = 7;
                                  _context.n = 8;
                                  return _next2();
                                case 8:
                                  _context.n = 10;
                                  break;
                                case 9:
                                  _context.p = 9;
                                  _t2 = _context.v;
                                  reject(_t2);
                                case 10:
                                  return _context.a(2);
                              }
                            }, _callee, null, [[7, 9], [0, 5]]);
                          }))();
                        case 15:
                          return _context2.a(2);
                      }
                    }, _callee2, null, [[5, 10, 11, 12]]);
                  }));
                  return function next() {
                    return _ref2.apply(this, arguments);
                  };
                })();
                _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee3() {
                  var index, _t4;
                  return _regenerator().w(function(_context3) {
                    while (1) switch (_context3.p = _context3.n) {
                      case 0:
                        index = 0;
                      case 1:
                        if (!(index < concurrency)) {
                          _context3.n = 7;
                          break;
                        }
                        _context3.p = 2;
                        _context3.n = 3;
                        return _next2();
                      case 3:
                        _context3.n = 5;
                        break;
                      case 4:
                        _context3.p = 4;
                        _t4 = _context3.v;
                        reject(_t4);
                        return _context3.a(3, 7);
                      case 5:
                        if (!(isIterableDone || isRejected)) {
                          _context3.n = 6;
                          break;
                        }
                        return _context3.a(3, 7);
                      case 6:
                        index++;
                        _context3.n = 1;
                        break;
                      case 7:
                        return _context3.a(2);
                    }
                  }, _callee3, null, [[2, 4]]);
                }))();
              }));
          }
        }, _callee4);
      }));
      return _pMap.apply(this, arguments);
    }
    var pMapSkip = /* @__PURE__ */ Symbol("skip");
  }
});

// node_modules/unzipper-esm/dist/Open/directory.js
var require_directory = __commonJS({
  "node_modules/unzipper-esm/dist/Open/directory.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = centralDirectory;
    var _path = _interopRequireDefault(require("path"));
    var _fs = _interopRequireDefault(require("fs"));
    var _unzip = _interopRequireDefault(require_unzip());
    var _mapPromises = _interopRequireDefault(require_mapPromises());
    var _PullStream = _interopRequireDefault(require_PullStream());
    var _BufferStream = _interopRequireDefault(require_BufferStream());
    var _parseExtraField = _interopRequireDefault(require_parseExtraField());
    var _parseDateTime = _interopRequireDefault(require_parseDateTime());
    var _parseBuffer = _interopRequireDefault(require_parseBuffer());
    var _ensureDir = _interopRequireDefault(require_ensureDir());
    var _ZipFileError = _interopRequireDefault(require_ZipFileError());
    function _interopRequireDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    function _regenerator() {
      var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag";
      function i(r2, n2, o2, i2) {
        var c2 = n2 && n2.prototype instanceof Generator ? n2 : Generator, u2 = Object.create(c2.prototype);
        return _regeneratorDefine2(u2, "_invoke", (function(r3, n3, o3) {
          var i3, c3, u3, f2 = 0, p = o3 || [], y = false, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d2(t2, r4) {
            return i3 = t2, c3 = 0, u3 = e, G.n = r4, a;
          } };
          function d(r4, n4) {
            for (c3 = r4, u3 = n4, t = 0; !y && f2 && !o4 && t < p.length; t++) {
              var o4, i4 = p[t], d2 = G.p, l = i4[2];
              r4 > 3 ? (o4 = l === n4) && (u3 = i4[(c3 = i4[4]) ? 5 : (c3 = 3, 3)], i4[4] = i4[5] = e) : i4[0] <= d2 && ((o4 = r4 < 2 && d2 < i4[1]) ? (c3 = 0, G.v = n4, G.n = i4[1]) : d2 < l && (o4 = r4 < 3 || i4[0] > n4 || n4 > l) && (i4[4] = r4, i4[5] = n4, G.n = l, c3 = 0));
            }
            if (o4 || r4 > 1) return a;
            throw y = true, n4;
          }
          return function(o4, p2, l) {
            if (f2 > 1) throw TypeError("Generator is already running");
            for (y && 1 === p2 && d(p2, l), c3 = p2, u3 = l; (t = c3 < 2 ? e : u3) || !y; ) {
              i3 || (c3 ? c3 < 3 ? (c3 > 1 && (G.n = -1), d(c3, u3)) : G.n = u3 : G.v = u3);
              try {
                if (f2 = 2, i3) {
                  if (c3 || (o4 = "next"), t = i3[o4]) {
                    if (!(t = t.call(i3, u3))) throw TypeError("iterator result is not an object");
                    if (!t.done) return t;
                    u3 = t.value, c3 < 2 && (c3 = 0);
                  } else 1 === c3 && (t = i3["return"]) && t.call(i3), c3 < 2 && (u3 = TypeError("The iterator does not provide a '" + o4 + "' method"), c3 = 1);
                  i3 = e;
                } else if ((t = (y = G.n < 0) ? u3 : r3.call(n3, G)) !== a) break;
              } catch (t2) {
                i3 = e, c3 = 1, u3 = t2;
              } finally {
                f2 = 1;
              }
            }
            return { value: t, done: y };
          };
        })(r2, o2, i2), true), u2;
      }
      var a = {};
      function Generator() {
      }
      function GeneratorFunction() {
      }
      function GeneratorFunctionPrototype() {
      }
      t = Object.getPrototypeOf;
      var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function() {
        return this;
      }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c);
      function f(e2) {
        return Object.setPrototypeOf ? Object.setPrototypeOf(e2, GeneratorFunctionPrototype) : (e2.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e2, o, "GeneratorFunction")), e2.prototype = Object.create(u), e2;
      }
      return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function() {
        return this;
      }), _regeneratorDefine2(u, "toString", function() {
        return "[object Generator]";
      }), (_regenerator = function _regenerator2() {
        return { w: i, m: f };
      })();
    }
    function _regeneratorDefine2(e, r, n, t) {
      var i = Object.defineProperty;
      try {
        i({}, "", {});
      } catch (e2) {
        i = 0;
      }
      _regeneratorDefine2 = function _regeneratorDefine(e2, r2, n2, t2) {
        function o(r3, n3) {
          _regeneratorDefine2(e2, r3, function(e3) {
            return this._invoke(r3, n3, e3);
          });
        }
        r2 ? i ? i(e2, r2, { value: n2, enumerable: !t2, configurable: !t2, writable: !t2 }) : e2[r2] = n2 : (o("next", 0), o("throw", 1), o("return", 2));
      }, _regeneratorDefine2(e, r, n, t);
    }
    function asyncGeneratorStep(n, t, e, r, o, a, c) {
      try {
        var i = n[a](c), u = i.value;
      } catch (n2) {
        return void e(n2);
      }
      i.done ? t(u) : Promise.resolve(u).then(r, o);
    }
    function _asyncToGenerator(n) {
      return function() {
        var t = this, e = arguments;
        return new Promise(function(r, o) {
          var a = n.apply(t, e);
          function _next(n2) {
            asyncGeneratorStep(a, r, o, _next, _throw, "next", n2);
          }
          function _throw(n2) {
            asyncGeneratorStep(a, r, o, _next, _throw, "throw", n2);
          }
          _next(void 0);
        });
      };
    }
    function _slicedToArray(r, e) {
      return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
    }
    function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function _unsupportedIterableToArray(r, a) {
      if (r) {
        if ("string" == typeof r) return _arrayLikeToArray(r, a);
        var t = {}.toString.call(r).slice(8, -1);
        return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
      }
    }
    function _arrayLikeToArray(r, a) {
      (null == a || a > r.length) && (a = r.length);
      for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
      return n;
    }
    function _iterableToArrayLimit(r, l) {
      var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
      if (null != t) {
        var e, n, i, u, a = [], f = true, o = false;
        try {
          if (i = (t = t.call(r)).next, 0 === l) {
            if (Object(t) !== t) return;
            f = false;
          } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
        } catch (r2) {
          o = true, n = r2;
        } finally {
          try {
            if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return;
          } finally {
            if (o) throw n;
          }
        }
        return a;
      }
    }
    function _arrayWithHoles(r) {
      if (Array.isArray(r)) return r;
    }
    var signature = Buffer.alloc(4);
    signature.writeUInt32LE(101010256, 0);
    function getCrxHeader(source) {
      var sourceStream = source.stream(0).pipe(new _PullStream["default"]());
      return sourceStream.pull(4).then(function(data) {
        var signature2 = data.readUInt32LE(0);
        if (signature2 === 875721283) {
          var crxHeader;
          return sourceStream.pull(12).then(function(data2) {
            crxHeader = (0, _parseBuffer["default"])(data2, [["version", 4], ["pubKeyLength", 4], ["signatureLength", 4]]);
          }).then(function() {
            return sourceStream.pull(crxHeader.pubKeyLength + crxHeader.signatureLength);
          }).then(function(data2) {
            crxHeader.publicKey = data2.slice(0, crxHeader.pubKeyLength);
            crxHeader.signature = data2.slice(crxHeader.pubKeyLength);
            crxHeader.size = 16 + crxHeader.pubKeyLength + crxHeader.signatureLength;
            return crxHeader;
          });
        }
      });
    }
    function getZip64CentralDirectory(source, zip64CDL) {
      var d64loc = (0, _parseBuffer["default"])(zip64CDL, [["signature", 4], ["diskNumber", 4], ["offsetToStartOfCentralDirectory", 8], ["numberOfDisks", 4]]);
      if (d64loc.signature != 117853008) {
        throw new _ZipFileError["default"]("INVALID_SIGNATURE", "invalid zip64 end of central dir locator signature (0x07064b50): 0x" + d64loc.signature.toString(16));
      }
      var dir64 = new _PullStream["default"]();
      source.stream(d64loc.offsetToStartOfCentralDirectory).pipe(dir64);
      return dir64.pull(56);
    }
    function parseZip64DirRecord(dir64record) {
      var vars = (0, _parseBuffer["default"])(dir64record, [["signature", 4], ["sizeOfCentralDirectory", 8], ["version", 2], ["versionsNeededToExtract", 2], ["diskNumber", 4], ["diskStart", 4], ["numberOfRecordsOnDisk", 8], ["numberOfRecords", 8], ["sizeOfCentralDirectory", 8], ["offsetToStartOfCentralDirectory", 8]]);
      if (vars.signature != 101075792) {
        throw new _ZipFileError["default"]("INVALID_SIGNATURE", "invalid zip64 end of central dir locator signature (0x06064b50): 0x0" + vars.signature.toString(16));
      }
      return vars;
    }
    function centralDirectory(source, options) {
      var endDir = new _PullStream["default"]();
      var records = new _PullStream["default"]();
      var tailSize = options && options.tailSize || 80;
      var sourceSize, crxHeader, startOffset, vars;
      if (options && options.crx) crxHeader = getCrxHeader(source);
      return source.size().then(function(size) {
        sourceSize = size;
        source.stream(Math.max(0, size - tailSize)).on("error", function(error) {
          endDir.emit("error", error);
        }).pipe(endDir);
        return endDir.pull(signature);
      }).then(function() {
        return Promise.all([endDir.pull(22), crxHeader]);
      }).then(function(_ref) {
        var _ref2 = _slicedToArray(_ref, 2), directory = _ref2[0], crxHeader2 = _ref2[1];
        var data = directory;
        startOffset = crxHeader2 && crxHeader2.size || 0;
        vars = (0, _parseBuffer["default"])(data, [["signature", 4], ["diskNumber", 2], ["diskStart", 2], ["numberOfRecordsOnDisk", 2], ["numberOfRecords", 2], ["sizeOfCentralDirectory", 4], ["offsetToStartOfCentralDirectory", 4], ["commentLength", 2]]);
        if (vars.diskNumber == 65535 || vars.numberOfRecords == 65535 || vars.offsetToStartOfCentralDirectory == 4294967295) {
          var zip64CDLSize = 20;
          var zip64CDLOffset = sourceSize - (tailSize - endDir.match + zip64CDLSize);
          var zip64CDLStream = new _PullStream["default"]();
          source.stream(zip64CDLOffset).pipe(zip64CDLStream);
          return zip64CDLStream.pull(zip64CDLSize).then(function(d) {
            return getZip64CentralDirectory(source, d);
          }).then(function(dir64record) {
            vars = parseZip64DirRecord(dir64record);
          });
        } else {
          vars.offsetToStartOfCentralDirectory += startOffset;
        }
      }).then(function() {
        if (vars.commentLength) return endDir.pull(vars.commentLength).then(function(comment) {
          vars.comment = comment.toString("utf8");
        });
      }).then(/* @__PURE__ */ _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee3() {
        var i;
        return _regenerator().w(function(_context3) {
          while (1) switch (_context3.n) {
            case 0:
              source.stream(vars.offsetToStartOfCentralDirectory).pipe(records);
              vars.extract = /* @__PURE__ */ (function() {
                var _ref4 = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee2(opts) {
                  var files;
                  return _regenerator().w(function(_context2) {
                    while (1) switch (_context2.n) {
                      case 0:
                        if (!(!opts || !opts.path)) {
                          _context2.n = 1;
                          break;
                        }
                        throw new Error("PATH_MISSING");
                      case 1:
                        opts.path = _path["default"].resolve(_path["default"].normalize(opts.path));
                        files = vars.files;
                        return _context2.a(2, Promise.resolve((0, _mapPromises["default"])(files, /* @__PURE__ */ (function() {
                          var _ref5 = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee(entry) {
                            var extractPath, rel, writer;
                            return _regenerator().w(function(_context) {
                              while (1) switch (_context.n) {
                                case 0:
                                  extractPath = _path["default"].join(opts.path, entry.path.replace(/\\/g, "/"));
                                  rel = _path["default"].relative(opts.path, extractPath);
                                  if (!(rel === "" || rel.startsWith("..") || _path["default"].isAbsolute(rel))) {
                                    _context.n = 1;
                                    break;
                                  }
                                  return _context.a(2);
                                case 1:
                                  if (!(entry.type == "Directory")) {
                                    _context.n = 3;
                                    break;
                                  }
                                  _context.n = 2;
                                  return (0, _ensureDir["default"])(extractPath);
                                case 2:
                                  return _context.a(2);
                                case 3:
                                  _context.n = 4;
                                  return (0, _ensureDir["default"])(_path["default"].dirname(extractPath));
                                case 4:
                                  writer = opts.getWriter ? opts.getWriter({
                                    path: extractPath
                                  }) : _fs["default"].createWriteStream(extractPath);
                                  return _context.a(2, new Promise(function(resolve, reject) {
                                    entry.stream(opts.password).on("error", reject).pipe(writer).on("close", resolve).on("error", reject);
                                  }));
                              }
                            }, _callee);
                          }));
                          return function(_x2) {
                            return _ref5.apply(this, arguments);
                          };
                        })(), {
                          concurrency: opts.concurrency > 1 ? opts.concurrency : 1
                        })));
                    }
                  }, _callee2);
                }));
                return function(_x) {
                  return _ref4.apply(this, arguments);
                };
              })();
              vars.files = [];
              i = 0;
            case 1:
              if (!(i < vars.numberOfRecords)) {
                _context3.n = 3;
                break;
              }
              _context3.n = 2;
              return records.pull(46).then(function(data) {
                var vars2 = (0, _parseBuffer["default"])(data, [["signature", 4], ["versionMadeBy", 2], ["versionsNeededToExtract", 2], ["flags", 2], ["compressionMethod", 2], ["lastModifiedTime", 2], ["lastModifiedDate", 2], ["crc32", 4], ["compressedSize", 4], ["uncompressedSize", 4], ["fileNameLength", 2], ["extraFieldLength", 2], ["fileCommentLength", 2], ["diskNumber", 2], ["internalFileAttributes", 2], ["externalFileAttributes", 4], ["offsetToLocalFileHeader", 4]]);
                vars2.offsetToLocalFileHeader += startOffset;
                vars2.lastModifiedDateTime = (0, _parseDateTime["default"])(vars2.lastModifiedDate, vars2.lastModifiedTime);
                return records.pull(vars2.fileNameLength).then(function(fileNameBuffer) {
                  vars2.pathBuffer = fileNameBuffer;
                  vars2.path = fileNameBuffer.toString("utf8");
                  vars2.isUnicode = (vars2.flags & 2048) != 0;
                  return records.pull(vars2.extraFieldLength);
                }).then(function(extraField) {
                  vars2.extra = (0, _parseExtraField["default"])(extraField, vars2);
                  return records.pull(vars2.fileCommentLength);
                }).then(function(comment) {
                  vars2.comment = comment;
                  vars2.type = vars2.uncompressedSize === 0 && /[/\\]$/.test(vars2.path) ? "Directory" : "File";
                  var padding = options && options.padding || 1e3;
                  vars2.stream = function(_password) {
                    var totalSize = 30 + padding + (vars2.extraFieldLength || 0) + (vars2.fileNameLength || 0) + vars2.compressedSize;
                    return (0, _unzip["default"])(source, vars2.offsetToLocalFileHeader, _password, vars2, totalSize);
                  };
                  vars2.buffer = function(_password) {
                    return (0, _BufferStream["default"])(vars2.stream(_password));
                  };
                  return vars2;
                });
              });
            case 2:
              vars.files[i] = _context3.v;
              i++;
              _context3.n = 1;
              break;
            case 3:
              return _context3.a(2, vars);
          }
        }, _callee3);
      })));
    }
  }
});

// node_modules/unzipper-esm/dist/Open/index.js
var require_Open = __commonJS({
  "node_modules/unzipper-esm/dist/Open/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = void 0;
    var _gracefulFs = _interopRequireDefault(require_graceful_fs());
    var _stream = require("stream");
    var _directory = _interopRequireDefault(require_directory());
    function _interopRequireDefault(e) {
      return e && e.__esModule ? e : { "default": e };
    }
    function _regenerator() {
      var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag";
      function i(r2, n2, o2, i2) {
        var c2 = n2 && n2.prototype instanceof Generator ? n2 : Generator, u2 = Object.create(c2.prototype);
        return _regeneratorDefine2(u2, "_invoke", (function(r3, n3, o3) {
          var i3, c3, u3, f2 = 0, p = o3 || [], y = false, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d2(t2, r4) {
            return i3 = t2, c3 = 0, u3 = e, G.n = r4, a;
          } };
          function d(r4, n4) {
            for (c3 = r4, u3 = n4, t = 0; !y && f2 && !o4 && t < p.length; t++) {
              var o4, i4 = p[t], d2 = G.p, l = i4[2];
              r4 > 3 ? (o4 = l === n4) && (u3 = i4[(c3 = i4[4]) ? 5 : (c3 = 3, 3)], i4[4] = i4[5] = e) : i4[0] <= d2 && ((o4 = r4 < 2 && d2 < i4[1]) ? (c3 = 0, G.v = n4, G.n = i4[1]) : d2 < l && (o4 = r4 < 3 || i4[0] > n4 || n4 > l) && (i4[4] = r4, i4[5] = n4, G.n = l, c3 = 0));
            }
            if (o4 || r4 > 1) return a;
            throw y = true, n4;
          }
          return function(o4, p2, l) {
            if (f2 > 1) throw TypeError("Generator is already running");
            for (y && 1 === p2 && d(p2, l), c3 = p2, u3 = l; (t = c3 < 2 ? e : u3) || !y; ) {
              i3 || (c3 ? c3 < 3 ? (c3 > 1 && (G.n = -1), d(c3, u3)) : G.n = u3 : G.v = u3);
              try {
                if (f2 = 2, i3) {
                  if (c3 || (o4 = "next"), t = i3[o4]) {
                    if (!(t = t.call(i3, u3))) throw TypeError("iterator result is not an object");
                    if (!t.done) return t;
                    u3 = t.value, c3 < 2 && (c3 = 0);
                  } else 1 === c3 && (t = i3["return"]) && t.call(i3), c3 < 2 && (u3 = TypeError("The iterator does not provide a '" + o4 + "' method"), c3 = 1);
                  i3 = e;
                } else if ((t = (y = G.n < 0) ? u3 : r3.call(n3, G)) !== a) break;
              } catch (t2) {
                i3 = e, c3 = 1, u3 = t2;
              } finally {
                f2 = 1;
              }
            }
            return { value: t, done: y };
          };
        })(r2, o2, i2), true), u2;
      }
      var a = {};
      function Generator() {
      }
      function GeneratorFunction() {
      }
      function GeneratorFunctionPrototype() {
      }
      t = Object.getPrototypeOf;
      var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function() {
        return this;
      }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c);
      function f(e2) {
        return Object.setPrototypeOf ? Object.setPrototypeOf(e2, GeneratorFunctionPrototype) : (e2.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e2, o, "GeneratorFunction")), e2.prototype = Object.create(u), e2;
      }
      return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function() {
        return this;
      }), _regeneratorDefine2(u, "toString", function() {
        return "[object Generator]";
      }), (_regenerator = function _regenerator2() {
        return { w: i, m: f };
      })();
    }
    function _regeneratorDefine2(e, r, n, t) {
      var i = Object.defineProperty;
      try {
        i({}, "", {});
      } catch (e2) {
        i = 0;
      }
      _regeneratorDefine2 = function _regeneratorDefine(e2, r2, n2, t2) {
        function o(r3, n3) {
          _regeneratorDefine2(e2, r3, function(e3) {
            return this._invoke(r3, n3, e3);
          });
        }
        r2 ? i ? i(e2, r2, { value: n2, enumerable: !t2, configurable: !t2, writable: !t2 }) : e2[r2] = n2 : (o("next", 0), o("throw", 1), o("return", 2));
      }, _regeneratorDefine2(e, r, n, t);
    }
    function asyncGeneratorStep(n, t, e, r, o, a, c) {
      try {
        var i = n[a](c), u = i.value;
      } catch (n2) {
        return void e(n2);
      }
      i.done ? t(u) : Promise.resolve(u).then(r, o);
    }
    function _asyncToGenerator(n) {
      return function() {
        var t = this, e = arguments;
        return new Promise(function(r, o) {
          var a = n.apply(t, e);
          function _next(n2) {
            asyncGeneratorStep(a, r, o, _next, _throw, "next", n2);
          }
          function _throw(n2) {
            asyncGeneratorStep(a, r, o, _next, _throw, "throw", n2);
          }
          _next(void 0);
        });
      };
    }
    var _default = exports2["default"] = {
      buffer: function buffer(_buffer, options) {
        var source = {
          stream: function stream(offset, length) {
            var stream2 = new _stream.PassThrough();
            var end = length ? offset + length : void 0;
            stream2.end(_buffer.slice(offset, end));
            return stream2;
          },
          size: function size() {
            return Promise.resolve(_buffer.length);
          }
        };
        return (0, _directory["default"])(source, options);
      },
      file: function file(filename, options) {
        var source = {
          stream: function stream(start, length) {
            var end = length ? start + length : void 0;
            return _gracefulFs["default"].createReadStream(filename, {
              start,
              end
            });
          },
          size: function size() {
            return new Promise(function(resolve, reject) {
              _gracefulFs["default"].stat(filename, function(err, d) {
                if (err) reject(err);
                else resolve(d.size);
              });
            });
          }
        };
        return (0, _directory["default"])(source, options);
      },
      url: function url(request, params, options) {
        if (typeof params === "string") params = {
          url: params
        };
        if (!params.url) throw "URL missing";
        params.headers = params.headers || {};
        var source = {
          stream: function stream(offset, length) {
            var options2 = Object.create(params);
            var end = length ? offset + length : "";
            options2.headers = Object.create(params.headers);
            options2.headers.range = "bytes=" + offset + "-" + end;
            return request(options2);
          },
          size: function size() {
            return new Promise(function(resolve, reject) {
              var req = request(params);
              req.on("response", function(d) {
                req.abort();
                if (!d.headers["content-length"]) reject(new Error("Missing content length header"));
                else resolve(d.headers["content-length"]);
              }).on("error", reject);
            });
          }
        };
        return (0, _directory["default"])(source, options);
      },
      s3: function s3(client, params, options) {
        var source = {
          size: function size() {
            return new Promise(function(resolve, reject) {
              client.headObject(params, function(err, d) {
                if (err) reject(err);
                else resolve(d.ContentLength);
              });
            });
          },
          stream: function stream(offset, length) {
            var d = {};
            for (var key in params) d[key] = params[key];
            var end = length ? offset + length : "";
            d.Range = "bytes=" + offset + "-" + end;
            return client.getObject(d).createReadStream();
          }
        };
        return (0, _directory["default"])(source, options);
      },
      s3_v3: function s3_v3(client, params, options) {
        var _global = global, GetObjectCommand = _global.GetObjectCommand, HeadObjectCommand = _global.HeadObjectCommand;
        if (!GetObjectCommand || !HeadObjectCommand) {
          throw new Error("You must set `global.GetObjectCommand` and `global.HeadObjectCommand` variables first");
        }
        var source = {
          size: (function() {
            var _size = _asyncToGenerator(/* @__PURE__ */ _regenerator().m(function _callee() {
              var head;
              return _regenerator().w(function(_context) {
                while (1) switch (_context.n) {
                  case 0:
                    _context.n = 1;
                    return client.send(new HeadObjectCommand({
                      Bucket: params.Bucket,
                      Key: params.Key
                    }));
                  case 1:
                    head = _context.v;
                    if (head.ContentLength) {
                      _context.n = 2;
                      break;
                    }
                    return _context.a(2, 0);
                  case 2:
                    return _context.a(2, head.ContentLength);
                }
              }, _callee);
            }));
            function size() {
              return _size.apply(this, arguments);
            }
            return size;
          })(),
          stream: function stream(offset, length) {
            var stream2 = new _stream.PassThrough();
            var end = length ? offset + length : "";
            client.send(new GetObjectCommand({
              Bucket: params.Bucket,
              Key: params.Key,
              Range: "bytes=".concat(offset, "-").concat(end)
            })).then(function(response) {
              response.Body.pipe(stream2);
            })["catch"](function(error) {
              stream2.emit("error", error);
            });
            return stream2;
          }
        };
        return (0, _directory["default"])(source, options);
      },
      custom: function custom(source, options) {
        return (0, _directory["default"])(source, options);
      }
    };
  }
});

// node_modules/unzipper-esm/index.cjs
var require_unzipper_esm = __commonJS({
  "node_modules/unzipper-esm/index.cjs"(exports2) {
    "use strict";
    exports2.Parse = require_parse().default;
    exports2.ParseOne = require_parseOne().default;
    exports2.Extract = require_extract().default;
    exports2.Open = require_Open().default;
    exports2.ZipFileError = require_ZipFileError().default;
  }
});

// node_modules/read-excel-file/commonjs/zip/UnzipError.js
var require_UnzipError = __commonJS({
  "node_modules/read-excel-file/commonjs/zip/UnzipError.js"(exports2) {
    "use strict";
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.createUnzipError = createUnzipError;
    exports2["default"] = void 0;
    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
      }
    }
    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      Object.defineProperty(Constructor, "prototype", { writable: false });
      return Constructor;
    }
    function _toPropertyKey(arg) {
      var key = _toPrimitive(arg, "string");
      return _typeof(key) === "symbol" ? key : String(key);
    }
    function _toPrimitive(input, hint) {
      if (_typeof(input) !== "object" || input === null) return input;
      var prim = input[Symbol.toPrimitive];
      if (prim !== void 0) {
        var res = prim.call(input, hint || "default");
        if (_typeof(res) !== "object") return res;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return (hint === "string" ? String : Number)(input);
    }
    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }
    function _inherits(subClass, superClass) {
      if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function");
      }
      subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } });
      Object.defineProperty(subClass, "prototype", { writable: false });
      if (superClass) _setPrototypeOf(subClass, superClass);
    }
    function _createSuper(Derived) {
      var hasNativeReflectConstruct = _isNativeReflectConstruct();
      return function _createSuperInternal() {
        var Super = _getPrototypeOf(Derived), result;
        if (hasNativeReflectConstruct) {
          var NewTarget = _getPrototypeOf(this).constructor;
          result = Reflect.construct(Super, arguments, NewTarget);
        } else {
          result = Super.apply(this, arguments);
        }
        return _possibleConstructorReturn(this, result);
      };
    }
    function _possibleConstructorReturn(self, call) {
      if (call && (_typeof(call) === "object" || typeof call === "function")) {
        return call;
      } else if (call !== void 0) {
        throw new TypeError("Derived constructors may only return object or undefined");
      }
      return _assertThisInitialized(self);
    }
    function _assertThisInitialized(self) {
      if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      }
      return self;
    }
    function _wrapNativeSuper(Class) {
      var _cache = typeof Map === "function" ? /* @__PURE__ */ new Map() : void 0;
      _wrapNativeSuper = function _wrapNativeSuper2(Class2) {
        if (Class2 === null || !_isNativeFunction(Class2)) return Class2;
        if (typeof Class2 !== "function") {
          throw new TypeError("Super expression must either be null or a function");
        }
        if (typeof _cache !== "undefined") {
          if (_cache.has(Class2)) return _cache.get(Class2);
          _cache.set(Class2, Wrapper);
        }
        function Wrapper() {
          return _construct(Class2, arguments, _getPrototypeOf(this).constructor);
        }
        Wrapper.prototype = Object.create(Class2.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } });
        return _setPrototypeOf(Wrapper, Class2);
      };
      return _wrapNativeSuper(Class);
    }
    function _construct(Parent, args, Class) {
      if (_isNativeReflectConstruct()) {
        _construct = Reflect.construct.bind();
      } else {
        _construct = function _construct2(Parent2, args2, Class2) {
          var a = [null];
          a.push.apply(a, args2);
          var Constructor = Function.bind.apply(Parent2, a);
          var instance = new Constructor();
          if (Class2) _setPrototypeOf(instance, Class2.prototype);
          return instance;
        };
      }
      return _construct.apply(null, arguments);
    }
    function _isNativeReflectConstruct() {
      if (typeof Reflect === "undefined" || !Reflect.construct) return false;
      if (Reflect.construct.sham) return false;
      if (typeof Proxy === "function") return true;
      try {
        Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
        }));
        return true;
      } catch (e) {
        return false;
      }
    }
    function _isNativeFunction(fn) {
      return Function.toString.call(fn).indexOf("[native code]") !== -1;
    }
    function _setPrototypeOf(o, p) {
      _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
        o2.__proto__ = p2;
        return o2;
      };
      return _setPrototypeOf(o, p);
    }
    function _getPrototypeOf(o) {
      _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf2(o2) {
        return o2.__proto__ || Object.getPrototypeOf(o2);
      };
      return _getPrototypeOf(o);
    }
    var UnzipError = exports2["default"] = /* @__PURE__ */ (function(_Error) {
      _inherits(UnzipError2, _Error);
      var _super = _createSuper(UnzipError2);
      function UnzipError2() {
        _classCallCheck(this, UnzipError2);
        return _super.apply(this, arguments);
      }
      return _createClass(UnzipError2);
    })(/* @__PURE__ */ _wrapNativeSuper(Error));
    function createUnzipError(error) {
      var unzipError = new UnzipError(error.message);
      if (error.stack) {
        unzipError.stack = error.stack;
      }
      if (Error.captureStackTrace) {
        Error.captureStackTrace(unzipError, createUnzipError);
      }
      unzipError.cause = error;
      return unzipError;
    }
  }
});

// node_modules/read-excel-file/commonjs/zip/unzipFromStream.unzipper.js
var require_unzipFromStream_unzipper = __commonJS({
  "node_modules/read-excel-file/commonjs/zip/unzipFromStream.unzipper.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = unzipFromStream_;
    var _unzipperEsm = require_unzipper_esm();
    var _UnzipError = require_UnzipError();
    var PROMISE_RESOLVE_VALUE = void 0;
    function unzipFromStream_(stream, onFile, onFileData, onFileDataEnd) {
      return new Promise(function(resolve, reject) {
        var promises = [];
        var errored = false;
        var onError = function onError2(error) {
          if (error instanceof _unzipperEsm.ZipFileError) {
            error = (0, _UnzipError.createUnzipError)(error);
          }
          if (!errored) {
            errored = true;
            reject(error);
          }
        };
        stream.on("error", onError).pipe((0, _unzipperEsm.Parse)()).on("error", onError).on("finish", function() {
          if (!errored) {
            Promise.all(promises).then(function() {
              resolve(PROMISE_RESOLVE_VALUE);
            }, onError);
          }
        }).on("entry", function(entry) {
          var ignore = false;
          if (entry.type === "Directory") {
            ignore = true;
          }
          if (errored) {
            ignore = true;
          }
          var uncompressedFileSizeIsKnown = !(entry.vars.flags & 8) || entry.vars.compressedSize > 0;
          var uncompressedFileSize = uncompressedFileSizeIsKnown ? entry.vars.uncompressedSize : void 0;
          if (onFile(entry.path, uncompressedFileSize) === false) {
            ignore = true;
          }
          if (ignore) {
            entry.autodrain().on("error", onError);
            return;
          }
          promises.push(new Promise(function(resolve2) {
            entry.on("data", function(data) {
              onFileData(entry.path, data);
            }).on("error", function(error) {
              onError(error);
            }).on("finish", function() {
              onFileDataEnd(entry.path);
              resolve2();
            });
          }));
        });
      });
    }
  }
});

// node_modules/read-excel-file/commonjs/zip/unzipFromStream.js
var require_unzipFromStream = __commonJS({
  "node_modules/read-excel-file/commonjs/zip/unzipFromStream.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = unzipFromStream;
    var _unzipFromStreamUnzipper = _interopRequireDefault(require_unzipFromStream_unzipper());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function _createForOfIteratorHelperLoose(o, allowArrayLike) {
      var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
      if (it) return (it = it.call(o)).next.bind(it);
      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;
        var i = 0;
        return function() {
          if (i >= o.length) return { done: true };
          return { done: false, value: o[i++] };
        };
      }
      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }
    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;
      for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
      return arr2;
    }
    function unzipFromStream(stream) {
      var _ref = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, filter = _ref.filter;
      var files = {};
      var filesData = {};
      var onFile = function onFile2(filePath, fileSize) {
        if (filter && !filter({
          path: filePath
        })) {
          return false;
        }
        filesData[filePath] = {
          size: fileSize,
          chunks: [],
          buffer: fileSize === void 0 ? void 0 : Buffer.alloc(fileSize),
          position: 0
        };
      };
      var onFileData = function onFileData2(filePath, chunk) {
        if (filesData[filePath].size === void 0) {
          filesData[filePath].chunks.push(chunk);
        } else {
          filesData[filePath].position += chunk.copy(filesData[filePath].buffer, filesData[filePath].position);
        }
      };
      var onFileDataEnd = function onFileDataEnd2(filePath) {
        if (filesData[filePath].size === void 0) {
          files[filePath] = concatChunksToNonPooledBuffer(filesData[filePath].chunks);
        } else {
          files[filePath] = filesData[filePath].buffer;
        }
        delete filesData[filePath];
      };
      return (0, _unzipFromStreamUnzipper["default"])(stream, onFile, onFileData, onFileDataEnd).then(function() {
        return files;
      });
    }
    function concatChunksToNonPooledBuffer(chunks) {
      var totalLength = chunks.reduce(function(sum, chunk2) {
        return sum + chunk2.length;
      }, 0);
      var buffer = Buffer.allocUnsafeSlow(totalLength);
      var offset = 0;
      for (var _iterator = _createForOfIteratorHelperLoose(chunks), _step; !(_step = _iterator()).done; ) {
        var chunk = _step.value;
        chunk.copy(buffer, offset);
        offset += chunk.length;
      }
      return buffer;
    }
  }
});

// node_modules/read-excel-file/commonjs/xlsx/file/InvalidInputError.js
var require_InvalidInputError = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/file/InvalidInputError.js"(exports2) {
    "use strict";
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = void 0;
    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
      }
    }
    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      Object.defineProperty(Constructor, "prototype", { writable: false });
      return Constructor;
    }
    function _toPropertyKey(arg) {
      var key = _toPrimitive(arg, "string");
      return _typeof(key) === "symbol" ? key : String(key);
    }
    function _toPrimitive(input, hint) {
      if (_typeof(input) !== "object" || input === null) return input;
      var prim = input[Symbol.toPrimitive];
      if (prim !== void 0) {
        var res = prim.call(input, hint || "default");
        if (_typeof(res) !== "object") return res;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return (hint === "string" ? String : Number)(input);
    }
    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }
    function _inherits(subClass, superClass) {
      if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function");
      }
      subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } });
      Object.defineProperty(subClass, "prototype", { writable: false });
      if (superClass) _setPrototypeOf(subClass, superClass);
    }
    function _createSuper(Derived) {
      var hasNativeReflectConstruct = _isNativeReflectConstruct();
      return function _createSuperInternal() {
        var Super = _getPrototypeOf(Derived), result;
        if (hasNativeReflectConstruct) {
          var NewTarget = _getPrototypeOf(this).constructor;
          result = Reflect.construct(Super, arguments, NewTarget);
        } else {
          result = Super.apply(this, arguments);
        }
        return _possibleConstructorReturn(this, result);
      };
    }
    function _possibleConstructorReturn(self, call) {
      if (call && (_typeof(call) === "object" || typeof call === "function")) {
        return call;
      } else if (call !== void 0) {
        throw new TypeError("Derived constructors may only return object or undefined");
      }
      return _assertThisInitialized(self);
    }
    function _assertThisInitialized(self) {
      if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      }
      return self;
    }
    function _wrapNativeSuper(Class) {
      var _cache = typeof Map === "function" ? /* @__PURE__ */ new Map() : void 0;
      _wrapNativeSuper = function _wrapNativeSuper2(Class2) {
        if (Class2 === null || !_isNativeFunction(Class2)) return Class2;
        if (typeof Class2 !== "function") {
          throw new TypeError("Super expression must either be null or a function");
        }
        if (typeof _cache !== "undefined") {
          if (_cache.has(Class2)) return _cache.get(Class2);
          _cache.set(Class2, Wrapper);
        }
        function Wrapper() {
          return _construct(Class2, arguments, _getPrototypeOf(this).constructor);
        }
        Wrapper.prototype = Object.create(Class2.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } });
        return _setPrototypeOf(Wrapper, Class2);
      };
      return _wrapNativeSuper(Class);
    }
    function _construct(Parent, args, Class) {
      if (_isNativeReflectConstruct()) {
        _construct = Reflect.construct.bind();
      } else {
        _construct = function _construct2(Parent2, args2, Class2) {
          var a = [null];
          a.push.apply(a, args2);
          var Constructor = Function.bind.apply(Parent2, a);
          var instance = new Constructor();
          if (Class2) _setPrototypeOf(instance, Class2.prototype);
          return instance;
        };
      }
      return _construct.apply(null, arguments);
    }
    function _isNativeReflectConstruct() {
      if (typeof Reflect === "undefined" || !Reflect.construct) return false;
      if (Reflect.construct.sham) return false;
      if (typeof Proxy === "function") return true;
      try {
        Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
        }));
        return true;
      } catch (e) {
        return false;
      }
    }
    function _isNativeFunction(fn) {
      return Function.toString.call(fn).indexOf("[native code]") !== -1;
    }
    function _setPrototypeOf(o, p) {
      _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
        o2.__proto__ = p2;
        return o2;
      };
      return _setPrototypeOf(o, p);
    }
    function _getPrototypeOf(o) {
      _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf2(o2) {
        return o2.__proto__ || Object.getPrototypeOf(o2);
      };
      return _getPrototypeOf(o);
    }
    var MESSAGES = {
      XLS_FILE_NOT_SUPPORTED: "You passed a legacy `.xls` file. Only `.xlsx` files are supported",
      FILE_NOT_SUPPORTED: "Doesn't look like an `.xlsx` file",
      INVALID_ZIP: "Couldn't unzip `.xlsx` file contents",
      NO_DATA: "No data"
    };
    var InvalidInputError = exports2["default"] = /* @__PURE__ */ (function(_Error) {
      _inherits(InvalidInputError2, _Error);
      var _super = _createSuper(InvalidInputError2);
      function InvalidInputError2(code, cause) {
        var _this;
        _classCallCheck(this, InvalidInputError2);
        _this = _super.call(this, MESSAGES[code] || code);
        _this.code = code;
        _this.name = "InvalidInputError";
        _this.cause = cause;
        return _this;
      }
      return _createClass(InvalidInputError2);
    })(/* @__PURE__ */ _wrapNativeSuper(Error));
  }
});

// node_modules/read-excel-file/commonjs/export/convertInputToNodeStream.js
var require_convertInputToNodeStream = __commonJS({
  "node_modules/read-excel-file/commonjs/export/convertInputToNodeStream.js"(exports2) {
    "use strict";
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = convertInputToNodeStream;
    var _nodeFs = _interopRequireDefault(require("node:fs"));
    var _nodeBuffer = require("node:buffer");
    var _nodeStream = _interopRequireWildcard(require("node:stream"));
    function _getRequireWildcardCache(nodeInterop) {
      if (typeof WeakMap !== "function") return null;
      var cacheBabelInterop = /* @__PURE__ */ new WeakMap();
      var cacheNodeInterop = /* @__PURE__ */ new WeakMap();
      return (_getRequireWildcardCache = function _getRequireWildcardCache2(nodeInterop2) {
        return nodeInterop2 ? cacheNodeInterop : cacheBabelInterop;
      })(nodeInterop);
    }
    function _interopRequireWildcard(obj, nodeInterop) {
      if (!nodeInterop && obj && obj.__esModule) {
        return obj;
      }
      if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") {
        return { "default": obj };
      }
      var cache = _getRequireWildcardCache(nodeInterop);
      if (cache && cache.has(obj)) {
        return cache.get(obj);
      }
      var newObj = {};
      var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
      for (var key in obj) {
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
          var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
          if (desc && (desc.get || desc.set)) {
            Object.defineProperty(newObj, key, desc);
          } else {
            newObj[key] = obj[key];
          }
        }
      }
      newObj["default"] = obj;
      if (cache) {
        cache.set(obj, newObj);
      }
      return newObj;
    }
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function convertInputToNodeStream(input) {
      return input instanceof _nodeStream["default"] ? input : input instanceof Buffer ? createReadableStreamFromBuffer(input) : input instanceof _nodeBuffer.Blob ? createReadableStreamFromBlob(input) : _nodeFs["default"].createReadStream(input);
    }
    function createReadableStreamFromBuffer(buffer) {
      return _nodeStream.Readable.from(buffer);
    }
    function createReadableStreamFromBlob(blob) {
      return _nodeStream.Readable.fromWeb(blob.stream());
    }
  }
});

// node_modules/read-excel-file/commonjs/export/filterZipArchiveEntry.js
var require_filterZipArchiveEntry = __commonJS({
  "node_modules/read-excel-file/commonjs/export/filterZipArchiveEntry.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = filterZipArchiveEntry;
    function filterZipArchiveEntry(_ref) {
      var path = _ref.path;
      return path.endsWith(".xml") || path.endsWith(".xml.rels");
    }
  }
});

// node_modules/read-excel-file/commonjs/xlsx/file/createFileTypeDetector.js
var require_createFileTypeDetector = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/file/createFileTypeDetector.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.XLS_FILE_TYPE = exports2.XLSX_FILE_TYPE = void 0;
    exports2["default"] = createFileTypeDetector;
    var ZIP_FILE_SIGNATURE = [80, 75];
    var XLS_FILE_SIGNATURE = [208, 207, 17, 224];
    var FILE_TYPE_SIGNATURES = [ZIP_FILE_SIGNATURE, XLS_FILE_SIGNATURE];
    var XLSX_FILE_TYPE = exports2.XLSX_FILE_TYPE = FILE_TYPE_SIGNATURES.indexOf(ZIP_FILE_SIGNATURE);
    var XLS_FILE_TYPE = exports2.XLS_FILE_TYPE = FILE_TYPE_SIGNATURES.indexOf(XLS_FILE_SIGNATURE);
    function createFileTypeDetector() {
      var type;
      var possibleTypes = indexesOf(FILE_TYPE_SIGNATURES);
      var i = 0;
      return function(_byte) {
        if (isNaN(type)) {
          var t;
          possibleTypes = possibleTypes.filter(function(typeIndex) {
            if (_byte === FILE_TYPE_SIGNATURES[typeIndex][i]) {
              if (FILE_TYPE_SIGNATURES[typeIndex].length === i + 1) {
                t = typeIndex;
              }
              return true;
            }
          });
          if (possibleTypes.length === 1) {
            type = t;
          } else if (possibleTypes.length === 0) {
            type = -1;
          }
        }
        i++;
        return type;
      };
    }
    function indexesOf(array) {
      var indexes = [];
      var i = 0;
      while (i < array.length) {
        indexes.push(i);
        i++;
      }
      return indexes;
    }
  }
});

// node_modules/read-excel-file/commonjs/xlsx/file/validateLeadingBytes.js
var require_validateLeadingBytes = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/file/validateLeadingBytes.js"(exports2) {
    "use strict";
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = validateLeadingBytes;
    exports2.noFileTypeCouldBeDetermined = noFileTypeCouldBeDetermined;
    exports2.validateByte = validateByte;
    var _InvalidInputError = _interopRequireDefault(require_InvalidInputError());
    var _createFileTypeDetector = _interopRequireWildcard(require_createFileTypeDetector());
    function _getRequireWildcardCache(nodeInterop) {
      if (typeof WeakMap !== "function") return null;
      var cacheBabelInterop = /* @__PURE__ */ new WeakMap();
      var cacheNodeInterop = /* @__PURE__ */ new WeakMap();
      return (_getRequireWildcardCache = function _getRequireWildcardCache2(nodeInterop2) {
        return nodeInterop2 ? cacheNodeInterop : cacheBabelInterop;
      })(nodeInterop);
    }
    function _interopRequireWildcard(obj, nodeInterop) {
      if (!nodeInterop && obj && obj.__esModule) {
        return obj;
      }
      if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") {
        return { "default": obj };
      }
      var cache = _getRequireWildcardCache(nodeInterop);
      if (cache && cache.has(obj)) {
        return cache.get(obj);
      }
      var newObj = {};
      var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
      for (var key in obj) {
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
          var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
          if (desc && (desc.get || desc.set)) {
            Object.defineProperty(newObj, key, desc);
          } else {
            newObj[key] = obj[key];
          }
        }
      }
      newObj["default"] = obj;
      if (cache) {
        cache.set(obj, newObj);
      }
      return newObj;
    }
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function _createForOfIteratorHelperLoose(o, allowArrayLike) {
      var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
      if (it) return (it = it.call(o)).next.bind(it);
      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;
        var i = 0;
        return function() {
          if (i >= o.length) return { done: true };
          return { done: false, value: o[i++] };
        };
      }
      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }
    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;
      for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
      return arr2;
    }
    function validateLeadingBytes(bytes) {
      var fileTypeDetector = (0, _createFileTypeDetector["default"])();
      for (var _iterator = _createForOfIteratorHelperLoose(bytes), _step; !(_step = _iterator()).done; ) {
        var _byte = _step.value;
        if (validateByte(_byte, fileTypeDetector)) {
          return;
        }
      }
      noFileTypeCouldBeDetermined(bytes.length);
    }
    function validateByte(_byte2, fileTypeDetector) {
      var fileType = fileTypeDetector(_byte2);
      if (fileType !== void 0) {
        if (fileType === _createFileTypeDetector.XLS_FILE_TYPE) {
          throw new _InvalidInputError["default"]("XLS_FILE_NOT_SUPPORTED");
        }
        if (fileType < 0) {
          throw new _InvalidInputError["default"]("FILE_NOT_SUPPORTED");
        }
        return true;
      }
    }
    function noFileTypeCouldBeDetermined(byteCount) {
      throw new _InvalidInputError["default"](byteCount === 0 ? "NO_DATA" : "FILE_NOT_SUPPORTED");
    }
  }
});

// node_modules/read-excel-file/commonjs/xlsx/file/InputValidationStream.js
var require_InputValidationStream = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/file/InputValidationStream.js"(exports2) {
    "use strict";
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = void 0;
    var _nodeStream = require("node:stream");
    var _createFileTypeDetector = _interopRequireDefault(require_createFileTypeDetector());
    var _validateLeadingBytes = require_validateLeadingBytes();
    var _InvalidInputError = _interopRequireDefault(require_InvalidInputError());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function _createForOfIteratorHelperLoose(o, allowArrayLike) {
      var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
      if (it) return (it = it.call(o)).next.bind(it);
      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;
        var i = 0;
        return function() {
          if (i >= o.length) return { done: true };
          return { done: false, value: o[i++] };
        };
      }
      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }
    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;
      for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
      return arr2;
    }
    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }
    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
      }
    }
    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      Object.defineProperty(Constructor, "prototype", { writable: false });
      return Constructor;
    }
    function _toPropertyKey(arg) {
      var key = _toPrimitive(arg, "string");
      return _typeof(key) === "symbol" ? key : String(key);
    }
    function _toPrimitive(input, hint) {
      if (_typeof(input) !== "object" || input === null) return input;
      var prim = input[Symbol.toPrimitive];
      if (prim !== void 0) {
        var res = prim.call(input, hint || "default");
        if (_typeof(res) !== "object") return res;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return (hint === "string" ? String : Number)(input);
    }
    function _inherits(subClass, superClass) {
      if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function");
      }
      subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } });
      Object.defineProperty(subClass, "prototype", { writable: false });
      if (superClass) _setPrototypeOf(subClass, superClass);
    }
    function _setPrototypeOf(o, p) {
      _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
        o2.__proto__ = p2;
        return o2;
      };
      return _setPrototypeOf(o, p);
    }
    function _createSuper(Derived) {
      var hasNativeReflectConstruct = _isNativeReflectConstruct();
      return function _createSuperInternal() {
        var Super = _getPrototypeOf(Derived), result;
        if (hasNativeReflectConstruct) {
          var NewTarget = _getPrototypeOf(this).constructor;
          result = Reflect.construct(Super, arguments, NewTarget);
        } else {
          result = Super.apply(this, arguments);
        }
        return _possibleConstructorReturn(this, result);
      };
    }
    function _possibleConstructorReturn(self, call) {
      if (call && (_typeof(call) === "object" || typeof call === "function")) {
        return call;
      } else if (call !== void 0) {
        throw new TypeError("Derived constructors may only return object or undefined");
      }
      return _assertThisInitialized(self);
    }
    function _assertThisInitialized(self) {
      if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      }
      return self;
    }
    function _isNativeReflectConstruct() {
      if (typeof Reflect === "undefined" || !Reflect.construct) return false;
      if (Reflect.construct.sham) return false;
      if (typeof Proxy === "function") return true;
      try {
        Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
        }));
        return true;
      } catch (e) {
        return false;
      }
    }
    function _getPrototypeOf(o) {
      _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf2(o2) {
        return o2.__proto__ || Object.getPrototypeOf(o2);
      };
      return _getPrototypeOf(o);
    }
    var InputValidationStream = exports2["default"] = /* @__PURE__ */ (function(_Transform) {
      _inherits(InputValidationStream2, _Transform);
      var _super = _createSuper(InputValidationStream2);
      function InputValidationStream2() {
        var _this;
        _classCallCheck(this, InputValidationStream2);
        _this = _super.call(this);
        _this.d = (0, _createFileTypeDetector["default"])();
        _this.i = 0;
        _this.chunks = [];
        return _this;
      }
      _createClass(InputValidationStream2, [{
        key: "_transform",
        value: function _transform(chunk, encoding, callback) {
          if (this.d) {
            this.chunks.push(chunk);
            for (var _iterator = _createForOfIteratorHelperLoose(chunk), _step; !(_step = _iterator()).done; ) {
              var _byte = _step.value;
              try {
                if ((0, _validateLeadingBytes.validateByte)(_byte, this.d)) {
                  this.d = void 0;
                  chunk = Buffer.concat(this.chunks);
                  this.chunks = void 0;
                  break;
                }
              } catch (error) {
                return callback(error);
              }
              this.i++;
            }
            if (this.d) {
              return callback();
            }
          }
          this.push(chunk);
          callback();
        }
        // `_flush()` is called when there will be no more input, before the "end" event is emitted.
      }, {
        key: "_flush",
        value: function _flush(callback) {
          if (this.d) {
            try {
              (0, _validateLeadingBytes.noFileTypeCouldBeDetermined)(this.i);
            } catch (error) {
              return callback(error);
            }
          }
          callback();
        }
      }]);
      return InputValidationStream2;
    })(_nodeStream.Transform);
  }
});

// node_modules/read-excel-file/commonjs/utility/checkpoint.js
var require_checkpoint = __commonJS({
  "node_modules/read-excel-file/commonjs/utility/checkpoint.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = checkpoint;
    exports2.latestCheckpointTimestamp = void 0;
    exports2.resetCheckpoint = resetCheckpoint;
    var latestCheckpointTimestamp;
    function checkpoint(name) {
      var now = Date.now();
      var shouldOutputLog = typeof global !== "undefined" ? Boolean(global.READ_EXCEL_FILE_CHECKPOINTS) : typeof window !== "undefined" ? Boolean(window.READ_EXCEL_FILE_CHECKPOINTS) : false;
      if (shouldOutputLog) {
        if (latestCheckpointTimestamp) {
          console.log("  -", now - latestCheckpointTimestamp, "ms");
        }
        console.log("*", name);
      }
      exports2.latestCheckpointTimestamp = latestCheckpointTimestamp = now;
    }
    function resetCheckpoint() {
      exports2.latestCheckpointTimestamp = latestCheckpointTimestamp = void 0;
    }
  }
});

// node_modules/read-excel-file/commonjs/export/unpackXlsxFileNode.js
var require_unpackXlsxFileNode = __commonJS({
  "node_modules/read-excel-file/commonjs/export/unpackXlsxFileNode.js"(exports2) {
    "use strict";
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = unpackXlsxFile;
    var _unzipFromStream = _interopRequireDefault(require_unzipFromStream());
    var _UnzipError = _interopRequireDefault(require_UnzipError());
    var _InvalidInputError = _interopRequireDefault(require_InvalidInputError());
    var _convertInputToNodeStream = _interopRequireDefault(require_convertInputToNodeStream());
    var _filterZipArchiveEntry = _interopRequireDefault(require_filterZipArchiveEntry());
    var _InputValidationStream = _interopRequireDefault(require_InputValidationStream());
    var _checkpoint = _interopRequireWildcard(require_checkpoint());
    function _getRequireWildcardCache(nodeInterop) {
      if (typeof WeakMap !== "function") return null;
      var cacheBabelInterop = /* @__PURE__ */ new WeakMap();
      var cacheNodeInterop = /* @__PURE__ */ new WeakMap();
      return (_getRequireWildcardCache = function _getRequireWildcardCache2(nodeInterop2) {
        return nodeInterop2 ? cacheNodeInterop : cacheBabelInterop;
      })(nodeInterop);
    }
    function _interopRequireWildcard(obj, nodeInterop) {
      if (!nodeInterop && obj && obj.__esModule) {
        return obj;
      }
      if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") {
        return { "default": obj };
      }
      var cache = _getRequireWildcardCache(nodeInterop);
      if (cache && cache.has(obj)) {
        return cache.get(obj);
      }
      var newObj = {};
      var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
      for (var key in obj) {
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
          var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
          if (desc && (desc.get || desc.set)) {
            Object.defineProperty(newObj, key, desc);
          } else {
            newObj[key] = obj[key];
          }
        }
      }
      newObj["default"] = obj;
      if (cache) {
        cache.set(obj, newObj);
      }
      return newObj;
    }
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function unpackXlsxFile(input) {
      (0, _checkpoint.resetCheckpoint)();
      (0, _checkpoint["default"])("unpack files");
      var stream = (0, _convertInputToNodeStream["default"])(input);
      return new Promise(function(resolve, reject) {
        var streamWithInputValidation = stream.on("error", reject).pipe(new _InputValidationStream["default"]());
        (0, _unzipFromStream["default"])(streamWithInputValidation, {
          filter: _filterZipArchiveEntry["default"]
        }).then(resolve, function(error) {
          if (error instanceof _UnzipError["default"]) {
            reject(new _InvalidInputError["default"]("INVALID_ZIP", error.cause));
          } else {
            reject(error);
          }
        });
      });
    }
  }
});

// node_modules/read-excel-file/commonjs/xlsx/parseSpreadsheetInfo.js
var require_parseSpreadsheetInfo = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/parseSpreadsheetInfo.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = parseSpreadsheetInfo;
    function parseSpreadsheetInfo(content, parseXml) {
      var state = createInitialState();
      return parseXml(content, state, onOpenTag, null, null).then(function() {
        return getResultFromState(state);
      });
      function createInitialState() {
        return {
          workbookPr: void 0,
          sheets: []
        };
      }
      function getResultFromState(state2) {
        return {
          epoch1904: state2.workbookPr ? state2.workbookPr.epoch1904 : false,
          sheets: state2.sheets
        };
      }
      function onOpenTag(tagName, attributes, state2) {
        if (tagName === "workbookPr") {
          if (!state2.workbookPr) {
            state2.workbookPr = {
              epoch1904: attributes.date1904 === "1"
            };
          }
        } else if (tagName === "sheet") {
          if (attributes.name) {
            state2.sheets.push({
              // `sheetId` attribute value is an arbitrary, `1`-based unique positive integer
              // assigned to a worksheet, typically starting at `1` for the first sheet.
              //  Deleting and adding new sheets might cause the sheetId values to become non-sequential.
              // For example, `sheetId`s could be `1`, `2`, `4`, if sheet `3` was deleted.
              id: Number(attributes.sheetId),
              name: attributes.name,
              relationId: attributes.id
            });
          }
        }
      }
    }
  }
});

// node_modules/read-excel-file/commonjs/xlsx/parseFilePaths.js
var require_parseFilePaths = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/parseFilePaths.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = parseFilePaths;
    function parseFilePaths(content, parseXml) {
      var RELATIONSHIPS_BASE_URL_TRANSITIONAL_STANDARD = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
      var RELATIONSHIPS_BASE_URL_STRICT_STANDARD = "http://purl.oclc.org/ooxml/officeDocument/relationships/";
      var state = createInitialState();
      return parseXml(content, state, onOpenTag, null, null).then(function() {
        return getResultFromState(state);
      });
      function createInitialState() {
        return {
          sheets: {},
          sharedStrings: void 0,
          styles: void 0
        };
      }
      function getResultFromState(state2) {
        return state2;
      }
      function onOpenTag(tagName, attributes, state2) {
        if (tagName === "Relationship") {
          addFilePathForRelation(state2, attributes.Id, attributes.Type, attributes.Target);
        }
      }
      function addFilePathForRelation(state2, id, type, target) {
        switch (type) {
          case RELATIONSHIPS_BASE_URL_TRANSITIONAL_STANDARD + "styles":
          case RELATIONSHIPS_BASE_URL_STRICT_STANDARD + "styles":
            state2.styles = getFilePathFromRelationTarget(target);
            break;
          case RELATIONSHIPS_BASE_URL_TRANSITIONAL_STANDARD + "sharedStrings":
          case RELATIONSHIPS_BASE_URL_STRICT_STANDARD + "sharedStrings":
            state2.sharedStrings = getFilePathFromRelationTarget(target);
            break;
          case RELATIONSHIPS_BASE_URL_TRANSITIONAL_STANDARD + "worksheet":
          case RELATIONSHIPS_BASE_URL_STRICT_STANDARD + "worksheet":
            state2.sheets[id] = getFilePathFromRelationTarget(target);
            break;
        }
      }
      function getFilePathFromRelationTarget(path) {
        if (path[0] === "/") {
          return path.slice("/".length);
        }
        return "xl/" + path;
      }
    }
  }
});

// node_modules/read-excel-file/commonjs/xlsx/parseStyles.js
var require_parseStyles = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/parseStyles.js"(exports2) {
    "use strict";
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = parseStyles;
    var _excluded = ["xfId"];
    function ownKeys(e, r) {
      var t = Object.keys(e);
      if (Object.getOwnPropertySymbols) {
        var o = Object.getOwnPropertySymbols(e);
        r && (o = o.filter(function(r2) {
          return Object.getOwnPropertyDescriptor(e, r2).enumerable;
        })), t.push.apply(t, o);
      }
      return t;
    }
    function _objectSpread(e) {
      for (var r = 1; r < arguments.length; r++) {
        var t = null != arguments[r] ? arguments[r] : {};
        r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
          _defineProperty(e, r2, t[r2]);
        }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
          Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
        });
      }
      return e;
    }
    function _defineProperty(obj, key, value) {
      key = _toPropertyKey(key);
      if (key in obj) {
        Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
      } else {
        obj[key] = value;
      }
      return obj;
    }
    function _toPropertyKey(arg) {
      var key = _toPrimitive(arg, "string");
      return _typeof(key) === "symbol" ? key : String(key);
    }
    function _toPrimitive(input, hint) {
      if (_typeof(input) !== "object" || input === null) return input;
      var prim = input[Symbol.toPrimitive];
      if (prim !== void 0) {
        var res = prim.call(input, hint || "default");
        if (_typeof(res) !== "object") return res;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return (hint === "string" ? String : Number)(input);
    }
    function _objectWithoutProperties(source, excluded) {
      if (source == null) return {};
      var target = _objectWithoutPropertiesLoose(source, excluded);
      var key, i;
      if (Object.getOwnPropertySymbols) {
        var sourceSymbolKeys = Object.getOwnPropertySymbols(source);
        for (i = 0; i < sourceSymbolKeys.length; i++) {
          key = sourceSymbolKeys[i];
          if (excluded.indexOf(key) >= 0) continue;
          if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
          target[key] = source[key];
        }
      }
      return target;
    }
    function _objectWithoutPropertiesLoose(source, excluded) {
      if (source == null) return {};
      var target = {};
      var sourceKeys = Object.keys(source);
      var key, i;
      for (i = 0; i < sourceKeys.length; i++) {
        key = sourceKeys[i];
        if (excluded.indexOf(key) >= 0) continue;
        target[key] = source[key];
      }
      return target;
    }
    function parseStyles(content, parseXml) {
      var state = createInitialState();
      return parseXml(content, state, onOpenTag, onCloseTag, null).then(function() {
        return getResultFromState(state);
      });
      function createInitialState() {
        return {
          numberFormats: [],
          baseStyles: [],
          // The first `164` elements of the `styles` array are going to be `undefined`
          // because those represent the built-in "default" styles in `.xlsx` specification.
          // These "default" styles have IDs from `0` to `163`, i.e. according to their index.
          styles: [],
          cellStyleXfs: false,
          cellXfs: false
        };
      }
      function getResultFromState(state2) {
        return state2.styles.map(function(style) {
          if (style.xfId) {
            var xfId = style.xfId, styleProperties = _objectWithoutProperties(style, _excluded);
            return _objectSpread(_objectSpread({}, state2.baseStyles[xfId]), styleProperties);
          } else {
            return style;
          }
        });
      }
      function onOpenTag(tagName, attributes, state2) {
        if (tagName === "numFmt") {
          var numFmtId = Number(attributes.numFmtId);
          var numberFormat = {
            id: numFmtId
          };
          if (numFmtId >= 100) {
            numberFormat.template = attributes.formatCode;
          }
          state2.numberFormats[numFmtId] = numberFormat;
        } else if (tagName === "cellStyleXfs") {
          state2.cellStyleXfs = true;
        } else if (tagName === "cellXfs") {
          state2.cellXfs = true;
        } else if (tagName === "xf") {
          if (state2.cellStyleXfs) {
            state2.baseStyles.push(parseCellStyle(attributes));
          } else if (state2.cellXfs) {
            var style = parseCellStyle(attributes, state2.numberFormats);
            if (attributes.xfId) {
              style.xfId = Number(attributes.xfId);
            }
            state2.styles.push(style);
          }
        }
      }
      function onCloseTag(tagName, state2) {
        if (tagName === "cellStyleXfs") {
          state2.cellStyleXfs = false;
        } else if (tagName === "cellXfs") {
          state2.cellXfs = false;
        }
      }
      function parseCellStyle(attributes, numberFormats) {
        var style = {};
        if (attributes.numFmtId) {
          var numFmtId = Number(attributes.numFmtId);
          if (numberFormats && numberFormats[numFmtId]) {
            style.numberFormat = numberFormats[numFmtId];
          } else {
            style.numberFormat = {
              id: numFmtId
            };
          }
        }
        return style;
      }
    }
  }
});

// node_modules/read-excel-file/commonjs/xlsx/parseSharedStrings.js
var require_parseSharedStrings = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/parseSharedStrings.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = parseSharedStrings;
    function parseSharedStrings(content, parseXml) {
      var state = createInitialState();
      return parseXml(content, state, onOpenTag, onCloseTag, onText).then(function() {
        return getResultFromState(state);
      });
      function createInitialState() {
        return {
          si: void 0,
          strings: []
        };
      }
      function getResultFromState(state2) {
        return state2.strings;
      }
      function onOpenTag(tagName, attributes, state2) {
        if (tagName === "si") {
          state2.si = createInitialStateInSharedString();
        } else if (state2.si) {
          onOpenTagInSharedString(tagName, attributes, state2.si);
        }
      }
      function onCloseTag(tagName, state2) {
        if (tagName === "si") {
          state2.strings.push(state2.si.string);
          state2.si = void 0;
        } else if (state2.si) {
          onCloseTagInSharedString(tagName, state2.si);
        }
      }
      function onText(text, state2) {
        if (state2.si) {
          onTextInSharedString(text, state2.si);
        }
      }
      function createInitialStateInSharedString() {
        return {
          t: false,
          r: false,
          rPh: false,
          string: ""
        };
      }
      function onOpenTagInSharedString(tagName, attributes, state2) {
        if (tagName === "t") {
          state2.t = true;
        } else if (tagName === "r") {
          state2.r = true;
        } else if (tagName === "rPh") {
          state2.rPh = true;
        }
      }
      function onCloseTagInSharedString(tagName, state2) {
        if (tagName === "t") {
          state2.t = false;
        } else if (tagName === "r") {
          state2.r = false;
        } else if (tagName === "rPh") {
          state2.rPh = false;
        }
      }
      function onTextInSharedString(text, state2) {
        if (state2.rPh) {
        } else if (state2.t) {
          if (state2.r) {
            state2.string += text;
          } else {
            state2.string = text;
          }
        }
      }
    }
  }
});

// node_modules/read-excel-file/commonjs/xlsx/parseExcelTimestamp.js
var require_parseExcelTimestamp = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/parseExcelTimestamp.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = parseExcelTimestamp;
    function parseExcelTimestamp(excelSerialDate, epoch1904) {
      var NUMBER_OF_LEAP_YEARS_BETWEEN_1900_AND_1970 = 17;
      var JANUARY_0TH_1900_DAY = 1;
      var ERRONEOUS_FEBRUARY_29_1990_DAY = 1;
      var DAY = 24 * 60 * 60 * 1e3;
      var DAYS_IN_YEAR = 365;
      if (epoch1904) {
        excelSerialDate += (1904 - 1900) * DAYS_IN_YEAR + JANUARY_0TH_1900_DAY + ERRONEOUS_FEBRUARY_29_1990_DAY;
      }
      var daysBeforeUnixEpoch = JANUARY_0TH_1900_DAY + ERRONEOUS_FEBRUARY_29_1990_DAY + (1970 - 1900) * DAYS_IN_YEAR + NUMBER_OF_LEAP_YEARS_BETWEEN_1900_AND_1970;
      return Math.floor((excelSerialDate - daysBeforeUnixEpoch) * DAY);
    }
  }
});

// node_modules/read-excel-file/commonjs/xlsx/isDateFormat.js
var require_isDateFormat = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/isDateFormat.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.DATE_FORMAT_TOKEN_SPLITTER_REG_EXP = exports2.DATE_FORMAT_TEMPLATE_TOKENS = exports2.DATE_FORMAT_POSTFIX_THAT_ALLOWS_ANY_ARBITRARY_TEXT_INPUT = void 0;
    exports2["default"] = isDateFormat;
    exports2.isDateFormatTemplate = isDateFormatTemplate;
    var DATE_FORMAT_POSTFIX_THAT_ALLOWS_ANY_ARBITRARY_TEXT_INPUT = exports2.DATE_FORMAT_POSTFIX_THAT_ALLOWS_ANY_ARBITRARY_TEXT_INPUT = /;@$/;
    var DATE_FORMAT_TOKEN_SPLITTER_REG_EXP = exports2.DATE_FORMAT_TOKEN_SPLITTER_REG_EXP = /[^a-z0#\?%]+/;
    function isDateFormat(formatId, template, dateFormatDetectionCache) {
      var cachedResult = dateFormatDetectionCache[formatId];
      if (cachedResult === void 0) {
        return dateFormatDetectionCache[formatId] = isDateFormatTemplate(template);
      }
      return cachedResult;
    }
    function isDateFormatTemplate(template) {
      template = template.toLowerCase();
      template = template.replace(DATE_FORMAT_POSTFIX_THAT_ALLOWS_ANY_ARBITRARY_TEXT_INPUT, "");
      template = template.replace(/\\./g, " ");
      var templates = template.split(";");
      return templates.some(isDateFormatSubTemplate);
      function isDateFormatSubTemplate(template2) {
        template2 = template2.replace(/"[^"]*"/g, " ");
        template2 = template2.replace(/(\[?[smhd]{1,2}\]?)[\.\,]00?0?/g, "$1");
        template2 = template2.replace(/\[([smhd]{1,2})\]/g, "$1");
        template2 = template2.replace(/\[[^\]]*\]/g, "");
        var tokens = template2.split(DATE_FORMAT_TOKEN_SPLITTER_REG_EXP).filter(function(_) {
          return _;
        });
        return tokens.length === 0 ? false : tokens.every(function(token) {
          return DATE_FORMAT_TEMPLATE_TOKENS.indexOf(token) >= 0;
        });
      }
    }
    var DATE_FORMAT_TEMPLATE_TOKENS = exports2.DATE_FORMAT_TEMPLATE_TOKENS = [
      // Seconds.
      "s",
      // Seconds (min two digits). Example: "05".
      "ss",
      // Minutes. Could also means months, depending on the context. Example: "5".
      "m",
      // Minutes (min two digits). Could also means months, depending on the context. Example: "05".
      "mm",
      // Hours. Example: "1".
      "h",
      // Hours (min two digits). Example: "01".
      "hh",
      // "am" part of "am/pm" or "AM/PM".
      "am",
      // "pm" part of "am/pm" or "AM/PM".
      "pm",
      // "a" part of "a/p" or "A/P".
      "a",
      // "p" part of "a/p" or "A/P".
      "p",
      // Day. Example: "1"
      "d",
      // Day (min two digits). Example: "01"
      "dd",
      // Short, three-letter abbreviation for the day of the week. Example: "Mon"
      "ddd",
      // Full name of the day of the week. Example: "Monday"
      "dddd",
      // Abbreviated weekday name. Example: "Mon", "Tue"
      "aaa",
      // Full weekday name. Example: "Monday", "Tuesday"
      "aaaa",
      // First letter of the weekday name. Example: "M", "T"
      "aaaaa",
      // Month (numeric). Could also mean minutes, depending on the context. Example: "1".
      "m",
      // Month (numeric, min two digits). Could also mean minutes, depending on the context. Example: "01".
      "mm",
      // Month (shortened month name). Example: "Jan".
      "mmm",
      // Month (full month name). Example: "January".
      "mmmm",
      // Month (first letter). Example: "J".
      "mmmmm",
      // Excel typically treats a single `y` the same as `yy` in custom formatting,
      // though standard practice is using `yy` or `yyyy`.
      "y",
      // Two-digit year, with a leading zero if needed. Example: "01".
      "yy",
      // Full year. Example: "2001".
      "yyyy",
      //
      // `e` or `ee` token stands for "era year" and represents an era-based year,
      // primarily supporting Japanese, Taiwanese, or Minguo/Buddhist calendar systems.
      // An example of an "era year" would be Heisei or Reiwa year numbers,
      // or Buddhist Era years which are Gregorian years plus 543.
      //
      // * `e` outputs the era year as a 4-digit (or unpadded) number.
      //   For example, `2026` or `115` depending on the active regional era.
      //   In standard Western/Gregorian locales, Excel often falls back to treating `e`
      //   similarly to a regular year layout.
      //
      // * `ee` outputs a 2-digit padded era year. For example, `26` or `15`.
      //
      // * `eeee` — While `yyyy` is the standard token for a 4-digit year,
      //   `eeee` is historically used for specialized international calendar eras
      //   (like the Japanese or Taiwanese imperial eras). However, in standard
      //   Western/Gregorian system locales, Excel treats `eeee` exactly like `yyyy`.
      "e",
      "ee",
      "eeee"
    ];
  }
});

// node_modules/read-excel-file/commonjs/xlsx/isDateFormatStyle.js
var require_isDateFormatStyle = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/isDateFormatStyle.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.BUILT_IN_DATE_FORMAT_IDS = void 0;
    exports2["default"] = isDateFormatStyle;
    var _isDateFormat = _interopRequireDefault(require_isDateFormat());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function isDateFormatStyle(style, defaultDateFormat, shouldGuessDateFormatFromNumberFormatTemplate, dateFormatDetectionCache) {
      if (!style.numberFormat) {
        return false;
      }
      if (
        // Whether it's a "number format" that's conventionally used for storing date timestamps.
        BUILT_IN_DATE_FORMAT_IDS.indexOf(style.numberFormat.id) >= 0 || // Whether it's a "number format" that uses a "formatting template"
        // that the developer is certain is a date formatting template.
        defaultDateFormat && style.numberFormat.template === defaultDateFormat || // Whether the "smart formatting template" feature is not disabled
        // and it has detected that it's a date formatting template by looking at it.
        shouldGuessDateFormatFromNumberFormatTemplate && style.numberFormat.template && (0, _isDateFormat["default"])(style.numberFormat.id, style.numberFormat.template, dateFormatDetectionCache)
      ) {
        return true;
      }
      return false;
    }
    var LOCALE_INDEPENDENT_BUILT_IN_DATE_FORMAT_IDS = [
      14,
      // mm-dd-yy
      15,
      // d-mmm-yy
      16,
      // d-mmm
      17,
      // mmm-yy
      18,
      // h:mm AM/PM
      19,
      // h:mm:ss AM/PM
      20,
      // h:mm
      21,
      // h:mm:ss
      22,
      // m/d/yy h:mm
      45,
      // mm:ss
      46,
      // [h]:mm:ss
      47
      // mmss.0
    ];
    var MAINLAND_CHINESE_OR_TAIWANESE_LOCALE_BUILT_IN_DATE_FORMAT_IDS = [
      27,
      // [$-404]e/m/d OR yyyy"年"m"月"
      28,
      // [$-404]e"年"m"月"d"日" OR m"月"d"日"
      29,
      // [$-404]e"年"m"月"d"日" OR m"月"d"日"
      30,
      // m/d/yy OR m-d-yy
      31,
      // yyyy"年"m"月"d"日" OR yyyy"年"m"月"d"日"
      32,
      // hh"時"mm"分" OR h"时"mm"分"
      33,
      // hh"時"mm"分"ss"秒" OR h"时"mm"分"ss"秒"
      34,
      // 上午/下午hh"時"mm"分" OR 上午/下午h"时"mm"分"
      35,
      // 上午/下午hh"時"mm"分"ss"秒" OR 上午/下午h"时"mm"分"ss"秒"
      36,
      // [$-404]e/m/d OR yyyy"年"m"月"
      50,
      // [$-404]e/m/d OR yyyy"年"m"月"
      51,
      // [$-404]e"年"m"月"d"日" OR m"月"d"日"
      52,
      // 上午/下午hh"時"mm"分" OR yyyy"年"m"月"
      53,
      // 上午/下午hh"時"mm"分"ss"秒" OR m"月"d"日"
      54,
      // [$-404]e"年"m"月"d"日" OR m"月"d"日"
      55,
      // 上午/下午hh"時"mm"分" OR 上午/下午h"时"mm"分"
      56,
      // 上午/下午hh"時"mm"分"ss"秒" OR 上午/下午h"时"mm"分"ss"秒"
      57,
      // [$-404]e/m/d OR yyyy"年"m"月"
      58
      // [$-404]e"年"m"月"d"日" OR m"月"d"日"
    ];
    var JAPANESE_OR_KOREAN_LOCALE_BUILT_IN_DATE_FORMAT_IDS = [
      27,
      // [$-411]ge.m.d OR yyyy"年" mm"月" dd"日"
      28,
      // [$-411]ggge"年"m"月"d"日" OR mm-dd
      29,
      // [$-411]ggge"年"m"月"d"日" OR mm-dd
      30,
      // m/d/yy OR mm-dd-yy
      31,
      // yyyy"年"m"月"d"日" OR yyyy"년" mm"월" dd"일"
      32,
      // h"時"mm"分" OR h"시" mm"분"
      33,
      // h"時"mm"分"ss"秒" OR h"시" mm"분" ss"초"
      34,
      // yyyy"年"m"月" OR yyyy-mm-dd
      35,
      // m"月"d"日" OR yyyy-mm-dd
      36,
      // [$-411]ge.m.d OR yyyy"年" mm"月" dd"日"
      50,
      // [$-411]ge.m.d OR yyyy"年" mm"月" dd"日"
      51,
      // [$-411]ggge"年"m"月"d"日" OR mm-dd
      52,
      // yyyy"年"m"月" OR yyyy-mm-dd
      53,
      // m"月"d"日" OR yyyy-mm-dd
      54,
      // [$-411]ggge"年"m"月"d"日" OR mm-dd
      55,
      // yyyy"年"m"月" OR yyyy-mm-dd
      56,
      // m"月"d"日" OR yyyy-mm-dd
      57,
      // [$-411]ge.m.d OR yyyy"年" mm"月" dd"日"
      58
      // [$-411]ggge"年"m"月"d"日" OR mm-dd
    ];
    var THAI_LOCALE_BUILT_IN_DATE_FORMAT_IDS = [
      71,
      // ว/ด/ปปปป
      72,
      // ว-ดดด-ปป
      73,
      // ว-ดดด
      74,
      // ดดด-ปป
      75,
      // ช:นน
      76,
      // ช:นน:ทท
      77,
      // ว/ด/ปปปป ช:นน
      78,
      // นน:ทท
      79,
      // [ช]:นน:ทท
      80,
      // นน:ทท.0
      81
      // d/m/bb
    ];
    var BUILT_IN_DATE_FORMAT_IDS = exports2.BUILT_IN_DATE_FORMAT_IDS = LOCALE_INDEPENDENT_BUILT_IN_DATE_FORMAT_IDS.concat(
      // Add Mainland Chinese or Taiwanese date format IDs that haven't already been added.
      MAINLAND_CHINESE_OR_TAIWANESE_LOCALE_BUILT_IN_DATE_FORMAT_IDS
    ).concat(
      // Add Japanese or Korean date format IDs that haven't already been added.
      JAPANESE_OR_KOREAN_LOCALE_BUILT_IN_DATE_FORMAT_IDS.filter(function(numberFormatId) {
        return MAINLAND_CHINESE_OR_TAIWANESE_LOCALE_BUILT_IN_DATE_FORMAT_IDS.indexOf(numberFormatId) < 0;
      })
    ).concat(
      // Add Thai date format IDs that haven't already been added.
      THAI_LOCALE_BUILT_IN_DATE_FORMAT_IDS.filter(function(numberFormatId) {
        return MAINLAND_CHINESE_OR_TAIWANESE_LOCALE_BUILT_IN_DATE_FORMAT_IDS.indexOf(numberFormatId) < 0;
      }).filter(function(numberFormatId) {
        return JAPANESE_OR_KOREAN_LOCALE_BUILT_IN_DATE_FORMAT_IDS.indexOf(numberFormatId) < 0;
      })
    );
  }
});

// node_modules/read-excel-file/commonjs/xlsx/parseCell.js
var require_parseCell = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/parseCell.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2.EMPTY_CELL = void 0;
    exports2["default"] = parseCell;
    var _parseExcelTimestamp = _interopRequireDefault(require_parseExcelTimestamp());
    var _isDateFormatStyle = _interopRequireDefault(require_isDateFormatStyle());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function _slicedToArray(arr, i) {
      return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
    }
    function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }
    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;
      for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
      return arr2;
    }
    function _iterableToArrayLimit(r, l) {
      var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
      if (null != t) {
        var e, n, i, u, a = [], f = true, o = false;
        try {
          if (i = (t = t.call(r)).next, 0 === l) {
            if (Object(t) !== t) return;
            f = false;
          } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
        } catch (r2) {
          o = true, n = r2;
        } finally {
          try {
            if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return;
          } finally {
            if (o) throw n;
          }
        }
        return a;
      }
    }
    function _arrayWithHoles(arr) {
      if (Array.isArray(arr)) return arr;
    }
    var EMPTY_CELL_VALUE = null;
    var EMPTY_CELL = exports2.EMPTY_CELL = [null, EMPTY_CELL_VALUE];
    function parseCell(t, s, v, inlineString, _ref) {
      var _ref2 = _slicedToArray(_ref, 7), sharedStrings = _ref2[0], styles = _ref2[1], epoch1904 = _ref2[2], dateFormatDetectionCache = _ref2[3], defaultDateFormat = _ref2[4], dateTemplateParser = _ref2[5], parseNumberCustom = _ref2[6];
      switch (t || "n") {
        // `t="str"` means that the cell value is calculated using a formula.
        // The formula is defined as the text of a child `<f/>` element.
        //
        // It could optionally include a `<v/>` element whose text is the cached result
        // of the calculation from the last time the file was saved in a spreadsheet editor application.
        //
        // An optional `<v/>` element holds a pre-computed result of the formula defined by `<f/>`.
        //
        // Example:
        //
        // <c r="B3" t="str">
        // 	<f>CONCATENATE(C1,D1)</f>
        // 	<v>C1ValueD1Value</v>
        // </c>
        //
        // Here's a guide on formulas in XLSX files:
        // https://github.com/MiniMax-AI/skills/blob/main/skills/minimax-xlsx/references/validate.md
        //
        case "str":
          if (v === void 0) {
            return "VALUE_MISSING";
          }
          if (!v) {
            return EMPTY_CELL;
          }
          return ["s", v];
        // `t="inlineStr"` means that `<is/>` holds the string value.
        //
        // Inside a `<c t="inlineStr"/>`, the specification requires there to exist an `<is/>` element,
        // and within that `<is/>` element it requires to exist a `<t/>` element.
        //
        // Example:
        //
        // <c r="A1" s="1" t="inlineStr">
        //   <is>
        //     <t>
        //       Test 123
        //     </t>
        //   </is>
        // </c>
        //
        case "inlineStr":
          if (inlineString === void 0) {
            return "VALUE_MISSING";
          }
          return ["s", inlineString];
        // `type="s"` means that the string value is stored in the Shared Strings Table.
        // This way it attempts to compress the `.xlsx` file by reusing all string values
        // in case they repeat throughout the spreadsheet.
        //
        // This optimization can't be used when writing an `.xlsx` file in a "streaming"
        // fashion, i.e. when the entire spreadsheet data is not known in adavance
        // at the start of writing the file.
        // But it can be used in all other situations. And hence, it is used.
        // So this is the most common cell type, actually.
        //
        // Example:
        //
        // <c r="A3" t="s">
        //   <v>3</v>
        // </c>
        //
        case "s":
          if (!v) {
            return "VALUE_MISSING";
          }
          var sharedStringIndex = Number(v);
          if (isNaN(sharedStringIndex) || sharedStrings[sharedStringIndex] === void 0) {
            return "VALUE_INVALID";
          }
          return ["s", sharedStrings[sharedStringIndex]];
        // Boolean (TRUE/FALSE) values are stored as either "1" or "0" in cells of type "b".
        //
        // Example:
        //
        // <c r="A1" t="b">
        //   <v>1</v>
        // </c>
        //
        case "b":
          if (!v) {
            return "VALUE_MISSING";
          }
          if (v === "1") {
            return ["b", true];
          }
          if (v === "0") {
            return ["b", false];
          }
          return "VALUE_INVALID";
        // If cell type is "e", the `<v/>` element's text is an error code string (required).
        //
        // Example:
        //
        // <c r="A1" t="e">
        //   <f>1/0</f>
        //   <v>#DIV/0!</v>
        // </c>
        //
        case "e":
          if (!v) {
            return "VALUE_MISSING";
          }
          return ["e", v];
        // XLSX supports date cells of type "d", though it seems like it (almost?) never
        // uses type "d" for storing dates, preferring type "n" and numeric timestamp instead.
        // The value of a "d" cell is supposedly a string in "ISO 8601" format.
        // I haven't seen an `.xlsx` file having such cells.
        //
        // Example:
        //
        // <c r="A1" s="1" t="d">
        //   <v>
        //     2021-06-10T00:47:45.700Z
        //   </v>
        // </c>
        //
        case "d":
          if (!v) {
            return EMPTY_CELL;
          }
          var parsedDate = new Date(v);
          if (isNaN(parsedDate.valueOf())) {
            return "VALUE_INVALID";
          }
          return ["d", parsedDate.getTime()];
        // type "n" is used for numeric cells.
        //
        // An optional `s` attribute defines how this number should be formatted — 
        // it should be a zero-based index of the style (XF record) in `styles.xml`.
        //
        // Example:
        //
        // <c r="A1" s="1" t="n">
        //   <v>123.45</v>
        // </c>
        //
        case "n":
          if (!v) {
            return EMPTY_CELL;
          }
          if (s) {
            var styleId = Number(s);
            if (isNaN(styleId) || styles[styleId] === void 0) {
              return "FORMAT_INVALID";
            }
            if ((0, _isDateFormatStyle["default"])(styles[styleId], defaultDateFormat, dateTemplateParser, dateFormatDetectionCache)) {
              var timestamp = Number(v);
              if (isNaN(timestamp)) {
                return "VALUE_INVALID";
              }
              return ["d", (0, _parseExcelTimestamp["default"])(timestamp, epoch1904)];
            }
          }
          if (parseNumberCustom) {
            return ["n", v];
          }
          var number = Number(v);
          if (isNaN(number)) {
            return "VALUE_INVALID";
          }
          return ["n", number];
        default:
          return "TYPE_INVALID";
      }
    }
  }
});

// node_modules/read-excel-file/commonjs/xlsx/parseCellAddress.js
var require_parseCellAddress = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/parseCellAddress.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = parseCellAddress;
    function parseCellAddress(cellAddress) {
      var columnNumber = 0;
      var i = 0;
      while (i < cellAddress.length) {
        var charCode = cellAddress.charCodeAt(i);
        if (charCode >= 48 && charCode <= 57) {
          var rowNumber = Number(cellAddress.slice(i));
          if (isNaN(rowNumber)) {
            invalidCellAddress(cellAddress);
          }
          return [
            // Row number (starting at `1`).
            rowNumber,
            // Column number (starting at `1`).
            columnNumber
          ];
        }
        columnNumber *= 26;
        columnNumber += cellAddress.charCodeAt(i) - 64;
        i++;
      }
      invalidCellAddress(cellAddress);
    }
    function invalidCellAddress(cellAddress) {
      throw new Error('<c r="'.concat(cellAddress, '">'));
    }
  }
});

// node_modules/read-excel-file/commonjs/xlsx/parseSheet.js
var require_parseSheet = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/parseSheet.js"(exports2) {
    "use strict";
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = parseSheet;
    var _parseCell = _interopRequireWildcard(require_parseCell());
    var _parseCellAddress3 = _interopRequireDefault(require_parseCellAddress());
    var _InvalidSpreadsheetError = _interopRequireDefault(require_InvalidSpreadsheetError());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function _getRequireWildcardCache(nodeInterop) {
      if (typeof WeakMap !== "function") return null;
      var cacheBabelInterop = /* @__PURE__ */ new WeakMap();
      var cacheNodeInterop = /* @__PURE__ */ new WeakMap();
      return (_getRequireWildcardCache = function _getRequireWildcardCache2(nodeInterop2) {
        return nodeInterop2 ? cacheNodeInterop : cacheBabelInterop;
      })(nodeInterop);
    }
    function _interopRequireWildcard(obj, nodeInterop) {
      if (!nodeInterop && obj && obj.__esModule) {
        return obj;
      }
      if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") {
        return { "default": obj };
      }
      var cache = _getRequireWildcardCache(nodeInterop);
      if (cache && cache.has(obj)) {
        return cache.get(obj);
      }
      var newObj = {};
      var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
      for (var key in obj) {
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
          var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
          if (desc && (desc.get || desc.set)) {
            Object.defineProperty(newObj, key, desc);
          } else {
            newObj[key] = obj[key];
          }
        }
      }
      newObj["default"] = obj;
      if (cache) {
        cache.set(obj, newObj);
      }
      return newObj;
    }
    function _slicedToArray(arr, i) {
      return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
    }
    function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function _iterableToArrayLimit(r, l) {
      var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
      if (null != t) {
        var e, n, i, u, a = [], f = true, o = false;
        try {
          if (i = (t = t.call(r)).next, 0 === l) {
            if (Object(t) !== t) return;
            f = false;
          } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
        } catch (r2) {
          o = true, n = r2;
        } finally {
          try {
            if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return;
          } finally {
            if (o) throw n;
          }
        }
        return a;
      }
    }
    function _arrayWithHoles(arr) {
      if (Array.isArray(arr)) return arr;
    }
    function _createForOfIteratorHelperLoose(o, allowArrayLike) {
      var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
      if (it) return (it = it.call(o)).next.bind(it);
      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;
        var i = 0;
        return function() {
          if (i >= o.length) return { done: true };
          return { done: false, value: o[i++] };
        };
      }
      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }
    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;
      for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
      return arr2;
    }
    var EMPTY_CELL_VALUE = null;
    function parseSheet(content, parseXml, _ref) {
      var sharedStrings = _ref.sharedStrings, styles = _ref.styles, epoch1904 = _ref.epoch1904, dateFormatDetectionCache = _ref.dateFormatDetectionCache, options = _ref.options;
      var parseCellParameters = [
        sharedStrings,
        styles,
        epoch1904,
        dateFormatDetectionCache,
        options.dateFormat,
        // defaultDateFormat
        options.smartDateParser !== false,
        // dateTemplateParser
        options.parseNumber
        // parseNumberCustom
      ];
      var rows = [];
      var errors = [];
      var state = createInitialState();
      return parseXml(content, state, onOpenTag, onCloseTag, onText, onProgress).then(function() {
        var _state$sheetData = state.sheetData, rowCount = _state$sheetData.rowCount, columnCount = _state$sheetData.columnCount, dataRowCount = _state$sheetData.dataRowCount, dataColumnCount = _state$sheetData.dataColumnCount;
        if (dataRowCount < rowCount) {
          rows = rows.slice(0, dataRowCount);
        }
        if (dataColumnCount < columnCount) {
          var i = 0;
          while (i < rows.length) {
            if (rows[i].length > dataColumnCount) {
              rows[i] = rows[i].slice(0, dataColumnCount);
            }
            i++;
          }
        }
        var startedAt = Date.now();
        for (var _iterator = _createForOfIteratorHelperLoose(rows), _step; !(_step = _iterator()).done; ) {
          var row = _step.value;
          while (row.length < dataColumnCount) {
            row.push(EMPTY_CELL_VALUE);
          }
        }
        return rows;
      });
      function createInitialState() {
        return {
          dimension: void 0,
          sheetData: void 0
        };
      }
      function getRowsFromState(state2) {
        return state2.sheetData.rows;
      }
      function setRowsInState(state2, rows2) {
        state2.sheetData.rowIndexShift += state2.sheetData.rows.length - rows2.length;
        state2.sheetData.rows = rows2;
      }
      function getErrorsFromState(state2) {
        return state2.sheetData.errors;
      }
      function setErrorsInState(state2, errors2) {
        state2.sheetData.errors = errors2;
      }
      var THROW_ON_FIRST_CELL_ERROR = true;
      function throwInvalidCellError(_ref2) {
        var row = _ref2.row, column = _ref2.column, error = _ref2.error;
        throw new _InvalidSpreadsheetError["default"]("<c/> at row ".concat(row, ", col ").concat(column, ": ").concat(error));
      }
      function onProgress(end) {
        if (!state.sheetData) {
          return;
        }
        var rowsRead = getRowsFromState(state);
        var errorsEncountered = getErrorsFromState(state);
        if (end) {
          rows = rows.concat(rowsRead);
          errors = errors.concat(errorsEncountered);
          if (errors.length > 0) {
            throwInvalidCellError(errors[0]);
          }
        } else {
          if (rowsRead.length > 1) {
            var finalizedRows = rowsRead.slice(0, -1);
            rows = rows.concat(finalizedRows);
            errors = errors.concat(errorsEncountered);
            setRowsInState(state, rowsRead.slice(-1));
            setErrorsInState(state, []);
          }
        }
      }
      function onOpenTag(tagName, attributes, state2) {
        if (tagName === "dimension") {
          state2.dimension = parseSheetDimensionRef(attributes.ref);
        } else if (tagName === "sheetData") {
          state2.sheetData = createInitialStateInSheetData();
        } else if (state2.sheetData) {
          onOpenTagInSheetData(tagName, attributes, state2.sheetData);
        }
      }
      function onCloseTag(tagName, state2) {
        if (state2.sheetData) {
          onCloseTagInSheetData(tagName, state2.sheetData);
        }
      }
      function onText(text, state2) {
        if (state2.sheetData) {
          onTextInSheetData(text, state2.sheetData);
        }
      }
      function parseSheetDimensionRef(ref) {
        var dimensions = ref.split(":").map(_parseCellAddress3["default"]);
        if (dimensions.length === 1) {
          dimensions = [dimensions[0], dimensions[0]];
        }
        return dimensions;
      }
      function createInitialStateInSheetData() {
        return {
          c: void 0,
          rows: [],
          row: void 0,
          rowNumber: void 0,
          // How many rows have been removed from the start of `state.rows`
          // as part of `onProgress()` handler calls.
          rowIndexShift: 0,
          // Current position in the sheet.
          cursor: [0, 0],
          // Total row count.
          rowCount: 0,
          // Total column count.
          columnCount: 0,
          // Non-empty row count.
          dataRowCount: 0,
          // Non-empty column count.
          dataColumnCount: 0,
          // Cell with errors.
          errors: []
        };
      }
      function onOpenTagInSheetData(tagName, attributes, state2) {
        if (tagName === "row") {
          if (attributes.r) {
            state2.rowNumber = Number(attributes.r);
          }
          state2.row = [];
        } else if (tagName === "c") {
          state2.c = createInitialStateInCell();
          state2.c.attributes = attributes;
        } else if (state2.c) {
          onOpenTagInCell(tagName, attributes, state2.c);
        }
      }
      function onCloseTagInSheetData(tagName, state2) {
        if (tagName === "row") {
          if (state2.rowNumber) {
            var previousRowNumber = state2.rowIndexShift + state2.rows.length;
            if (state2.rowNumber <= previousRowNumber) {
              throw new _InvalidSpreadsheetError["default"]("Out-of-place <row/> number ".concat(state2.rowNumber, " follows <row/> number ").concat(previousRowNumber));
            }
            while (state2.rowNumber > state2.rowIndexShift + state2.rows.length + 1) {
              state2.rows.push([]);
            }
          }
          state2.rows.push(state2.row);
          if (state2.row.length > 0) {
            state2.dataRowCount = state2.rowNumber;
          }
          if (state2.rowNumber > state2.rowCount) {
            state2.rowCount = state2.rowNumber;
          }
          state2.row = void 0;
          state2.rowNumber = void 0;
        } else if (tagName === "c") {
          var cell = parseCellFromXmlData(state2.c);
          if (cell.row < state2.cursor[0] || cell.row === state2.cursor[0] && cell.column <= state2.cursor[1]) {
            throw new _InvalidSpreadsheetError["default"]("Out-of-place <c/> at row ".concat(cell.row, " col ").concat(cell.column, " follows <c/> at row ").concat(state2.cursor[0], " col ").concat(state2.cursor[1]));
          }
          state2.cursor[0] = cell.row;
          state2.cursor[1] = cell.column;
          if (!state2.rowNumber) {
            state2.rowNumber = cell.row;
          }
          if (cell.error) {
            if (THROW_ON_FIRST_CELL_ERROR) {
              throwInvalidCellError(cell);
            }
            state2.errors.push(cell);
          } else if (cell.value !== EMPTY_CELL_VALUE) {
            while (cell.column > state2.row.length + 1) {
              state2.row.push(EMPTY_CELL_VALUE);
            }
            state2.row.push(cell.value);
            if (cell.column > state2.dataColumnCount) {
              state2.dataColumnCount = cell.column;
            }
          }
          if (cell.column > state2.columnCount) {
            state2.columnCount = cell.column;
          }
          state2.c = void 0;
        } else if (state2.c) {
          onCloseTagInCell(tagName, state2.c);
        }
      }
      function onTextInSheetData(text, state2) {
        if (state2.c) {
          onTextInCell(text, state2.c);
        }
      }
      function parseCellFromXmlData(_ref3) {
        var attributes = _ref3.attributes, inlineString = _ref3.inlineString, vText = _ref3.vText;
        var _parseCellAddress = (0, _parseCellAddress3["default"])(attributes.r), _parseCellAddress2 = _slicedToArray(_parseCellAddress, 2), row = _parseCellAddress2[0], column = _parseCellAddress2[1];
        var errorOrTypeAndValue = parseCellAndTrimValue(attributes.t, attributes.s, vText, inlineString, parseCellParameters, options.trim !== false);
        if (typeof errorOrTypeAndValue === "string") {
          return {
            row,
            column,
            error: errorOrTypeAndValue
            // // Report the "raw" unparsed value of the cell for potential debugging.
            // // Also report the cell type and the format in case of a numeric value.
            // //
            // // For "inline string" cells, the value should actually be the `inlineString` argument
            // // rather than `vText` argument, but the only case when it could throw an error
            // // when parsing an "inline string" cell is `VALUE_MISSING` which means that
            // // `inlineString` argument is `undefined`, same as `vText` argument in this case,
            // // so the resulting `value` property is correct anyway.
            // //
            // value: vText,
            // type: attributes.t,
            // formatId: attributes.s
          };
        }
        return {
          row,
          column,
          value: parseCellValue(errorOrTypeAndValue[1], errorOrTypeAndValue[0])
        };
      }
      function parseCellAndTrimValue(t, s, v, inlineString, parameters, trimStrings) {
        var errorOrTypeAndValue = parseCellWithRepairAbility(t, s, v, inlineString, parameters);
        if (Array.isArray(errorOrTypeAndValue) && errorOrTypeAndValue[0] === "s") {
          if (trimStrings) {
            errorOrTypeAndValue[1] = errorOrTypeAndValue[1].trim();
          }
          if (errorOrTypeAndValue[1] === "") {
            return _parseCell.EMPTY_CELL;
          }
        }
        return errorOrTypeAndValue;
      }
      function parseCellWithRepairAbility(t, s, v, inlineString, parameters) {
        var errorOrTypeAndValue = (0, _parseCell["default"])(t, s, v, inlineString, parameters);
        if (errorOrTypeAndValue === "VALUE_MISSING") {
          switch (t || "n") {
            // * If the cell is defined by a formula.
            // * Or contains an inline string.
            // * Or contains a shared string.
            // * Or contains a boolean value.
            case "str":
            case "inlineStr":
            case "s":
            case "b":
              return _parseCell.EMPTY_CELL;
          }
        }
        if (t === "e") {
          return _parseCell.EMPTY_CELL;
        }
        return errorOrTypeAndValue;
      }
      function parseCellValue(value, type) {
        if (type === "n") {
          if (options.parseNumber) {
            return options.parseNumber(value);
          }
          return value;
        } else if (type === "d") {
          return new Date(value);
        } else {
          return value;
        }
      }
      function createInitialStateInCell() {
        return {
          v: false,
          is: false,
          t: false,
          r: false,
          rPh: false,
          vText: void 0,
          inlineString: void 0,
          attributes: void 0
        };
      }
      function onOpenTagInCell(tagName, attributes, state2) {
        if (tagName === "v") {
          state2.v = true;
        } else if (tagName === "is") {
          state2.is = true;
          state2.inlineString = "";
        } else if (tagName === "t") {
          state2.t = true;
        } else if (tagName === "r") {
          state2.r = true;
        } else if (tagName === "rPh") {
          state2.rPh = true;
        }
      }
      function onCloseTagInCell(tagName, state2) {
        if (tagName === "v") {
          state2.v = false;
          state2.vText || (state2.vText = "");
        } else if (tagName === "is") {
          state2.is = false;
        } else if (tagName === "t") {
          state2.t = false;
        } else if (tagName === "r") {
          state2.r = false;
        } else if (tagName === "rPh") {
          state2.rPh = false;
        }
      }
      function onTextInCell(text, state2) {
        if (state2.v) {
          state2.vText = text;
        } else if (state2.is) {
          if (state2.rPh) {
          } else if (state2.t) {
            if (state2.r) {
              state2.inlineString += text;
            } else {
              state2.inlineString = text;
            }
          }
        }
      }
      function getSheetDimensions(cells) {
        var minRow = cells.length === 0 ? 0 : 1;
        var minCol = cells.length === 0 ? 0 : 1;
        var maxRow = 0;
        var maxCol = 0;
        for (var _iterator2 = _createForOfIteratorHelperLoose(cells), _step2; !(_step2 = _iterator2()).done; ) {
          var cell = _step2.value;
          if (maxRow < cell.row) {
            maxRow = cell.row;
          }
          if (maxCol < cell.column) {
            maxCol = cell.column;
          }
        }
        return [[minRow, minCol], [maxRow, maxCol]];
      }
    }
  }
});

// node_modules/fflate/lib/node.cjs
var require_node3 = __commonJS({
  "node_modules/fflate/lib/node.cjs"(exports2) {
    "use strict";
    exports2.deflate = deflate;
    exports2.deflateSync = deflateSync;
    exports2.inflate = inflate;
    exports2.inflateSync = inflateSync;
    exports2.gzip = gzip;
    exports2.compress = gzip;
    exports2.gzipSync = gzipSync;
    exports2.compressSync = gzipSync;
    exports2.gunzip = gunzip;
    exports2.gunzipSync = gunzipSync;
    exports2.zlib = zlib;
    exports2.zlibSync = zlibSync;
    exports2.unzlib = unzlib;
    exports2.unzlibSync = unzlibSync;
    exports2.gzip = gzip;
    exports2.compress = gzip;
    exports2.decompress = decompress;
    exports2.decompressSync = decompressSync;
    exports2.strToU8 = strToU8;
    exports2.strFromU8 = strFromU8;
    exports2.zip = zip;
    exports2.zipSync = zipSync;
    exports2.unzip = unzip;
    exports2.unzipSync = unzipSync;
    var _a;
    var Worker;
    var isMarkedAsUntransferable;
    var workerAdd = ";var __w=require('worker_threads');__w.parentPort.on('message',function(m){onmessage({data:m})}),postMessage=function(m,t){__w.parentPort.postMessage(m,t)},close=process.exit;self=global";
    try {
      _a = require("worker_threads"), Worker = _a.Worker, isMarkedAsUntransferable = _a.isMarkedAsUntransferable;
    } catch (e) {
    }
    var node_worker_1 = {};
    node_worker_1["default"] = Worker ? function(c, _, msg, transfer, cb) {
      var done = false;
      var w = new Worker(c + workerAdd, { eval: true }).on("error", function(e) {
        return cb(e, null);
      }).on("message", function(m) {
        return cb(null, m);
      }).on("exit", function(c2) {
        if (c2 && !done)
          cb(new Error("exited with code " + c2), null);
      });
      if (isMarkedAsUntransferable)
        transfer = transfer.filter(function(t) {
          return !isMarkedAsUntransferable(t);
        });
      w.postMessage(msg, transfer);
      w.terminate = function() {
        done = true;
        return Worker.prototype.terminate.call(w);
      };
      return w;
    } : function(_, __, ___, ____, cb) {
      setImmediate(function() {
        return cb(new Error("async operations unsupported - update to Node 12+ (or Node 10-11 with the --experimental-worker CLI flag)"), null);
      });
      var NOP = function() {
      };
      return {
        terminate: NOP,
        postMessage: NOP
      };
    };
    var u8 = Uint8Array;
    var u16 = Uint16Array;
    var i32 = Int32Array;
    var fleb = new u8([
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      2,
      2,
      2,
      2,
      3,
      3,
      3,
      3,
      4,
      4,
      4,
      4,
      5,
      5,
      5,
      5,
      0,
      /* unused */
      0,
      0,
      /* impossible */
      0
    ]);
    var fdeb = new u8([
      0,
      0,
      0,
      0,
      1,
      1,
      2,
      2,
      3,
      3,
      4,
      4,
      5,
      5,
      6,
      6,
      7,
      7,
      8,
      8,
      9,
      9,
      10,
      10,
      11,
      11,
      12,
      12,
      13,
      13,
      /* unused */
      0,
      0
    ]);
    var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
    var freb = function(eb, start) {
      var b = new u16(31);
      for (var i2 = 0; i2 < 31; ++i2) {
        b[i2] = start += 1 << eb[i2 - 1];
      }
      var r = new i32(b[30]);
      for (var i2 = 1; i2 < 30; ++i2) {
        for (var j = b[i2]; j < b[i2 + 1]; ++j) {
          r[j] = j - b[i2] << 5 | i2;
        }
      }
      return { b, r };
    };
    var _a = freb(fleb, 2);
    var fl = _a.b;
    var revfl = _a.r;
    fl[28] = 258, revfl[258] = 28;
    var _b = freb(fdeb, 0);
    var fd = _b.b;
    var revfd = _b.r;
    var rev = new u16(32768);
    for (i = 0; i < 32768; ++i) {
      x = (i & 43690) >> 1 | (i & 21845) << 1;
      x = (x & 52428) >> 2 | (x & 13107) << 2;
      x = (x & 61680) >> 4 | (x & 3855) << 4;
      rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
    }
    var x;
    var i;
    var hMap = (function(cd, mb, r) {
      var s = cd.length;
      var i2 = 0;
      var l = new u16(mb);
      for (; i2 < s; ++i2) {
        if (cd[i2])
          ++l[cd[i2] - 1];
      }
      var le = new u16(mb);
      for (i2 = 1; i2 < mb; ++i2) {
        le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
      }
      var co;
      if (r) {
        co = new u16(1 << mb);
        var rvb = 15 - mb;
        for (i2 = 0; i2 < s; ++i2) {
          if (cd[i2]) {
            var sv = i2 << 4 | cd[i2];
            var r_1 = mb - cd[i2];
            var v = le[cd[i2] - 1]++ << r_1;
            for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
              co[rev[v] >> rvb] = sv;
            }
          }
        }
      } else {
        co = new u16(s);
        for (i2 = 0; i2 < s; ++i2) {
          if (cd[i2]) {
            co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
          }
        }
      }
      return co;
    });
    var flt = new u8(288);
    for (i = 0; i < 144; ++i)
      flt[i] = 8;
    var i;
    for (i = 144; i < 256; ++i)
      flt[i] = 9;
    var i;
    for (i = 256; i < 280; ++i)
      flt[i] = 7;
    var i;
    for (i = 280; i < 288; ++i)
      flt[i] = 8;
    var i;
    var fdt = new u8(32);
    for (i = 0; i < 32; ++i)
      fdt[i] = 5;
    var i;
    var flm = /* @__PURE__ */ hMap(flt, 9, 0);
    var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
    var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
    var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
    var max = function(a) {
      var m = a[0];
      for (var i2 = 1; i2 < a.length; ++i2) {
        if (a[i2] > m)
          m = a[i2];
      }
      return m;
    };
    var bits = function(d, p, m) {
      var o = p / 8 | 0;
      return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
    };
    var bits16 = function(d, p) {
      var o = p / 8 | 0;
      return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
    };
    var shft = function(p) {
      return (p + 7) / 8 | 0;
    };
    var slc = function(v, s, e) {
      if (s == null || s < 0)
        s = 0;
      if (e == null || e > v.length)
        e = v.length;
      return new u8(v.subarray(s, e));
    };
    exports2.FlateErrorCode = {
      UnexpectedEOF: 0,
      InvalidBlockType: 1,
      InvalidLengthLiteral: 2,
      InvalidDistance: 3,
      StreamFinished: 4,
      NoStreamHandler: 5,
      InvalidHeader: 6,
      NoCallback: 7,
      InvalidUTF8: 8,
      ExtraFieldTooLong: 9,
      InvalidDate: 10,
      FilenameTooLong: 11,
      StreamFinishing: 12,
      InvalidZipData: 13,
      UnknownCompressionMethod: 14
    };
    var ec = [
      "unexpected EOF",
      "invalid block type",
      "invalid length/literal",
      "invalid distance",
      "stream finished",
      "no stream handler",
      ,
      // determined by compression function
      "no callback",
      "invalid UTF-8 data",
      "extra field too long",
      "date not in range 1980-2099",
      "filename too long",
      "stream finishing",
      "invalid zip data"
      // determined by unknown compression method
    ];
    var err = function(ind, msg, nt) {
      var e = new Error(msg || ec[ind]);
      e.code = ind;
      if (Error.captureStackTrace)
        Error.captureStackTrace(e, err);
      if (!nt)
        throw e;
      return e;
    };
    var inflt = function(dat, st, buf, dict) {
      var sl = dat.length, dl = dict ? dict.length : 0;
      if (!sl || st.f && !st.l)
        return buf || new u8(0);
      var noBuf = !buf;
      var resize = noBuf || st.i != 2;
      var noSt = st.i;
      if (noBuf)
        buf = new u8(sl * 3);
      var cbuf = function(l2) {
        var bl = buf.length;
        if (l2 > bl) {
          var nbuf = new u8(Math.max(bl * 2, l2));
          nbuf.set(buf);
          buf = nbuf;
        }
      };
      var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
      var tbts = sl * 8;
      do {
        if (!lm) {
          final = bits(dat, pos, 1);
          var type = bits(dat, pos + 1, 3);
          pos += 3;
          if (!type) {
            var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
            if (t > sl) {
              if (noSt)
                err(0);
              break;
            }
            if (resize)
              cbuf(bt + l);
            buf.set(dat.subarray(s, t), bt);
            st.b = bt += l, st.p = pos = t * 8, st.f = final;
            continue;
          } else if (type == 1)
            lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
          else if (type == 2) {
            var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
            var tl = hLit + bits(dat, pos + 5, 31) + 1;
            pos += 14;
            var ldt = new u8(tl);
            var clt = new u8(19);
            for (var i2 = 0; i2 < hcLen; ++i2) {
              clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
            }
            pos += hcLen * 3;
            var clb = max(clt), clbmsk = (1 << clb) - 1;
            var clm = hMap(clt, clb, 1);
            for (var i2 = 0; i2 < tl; ) {
              var r = clm[bits(dat, pos, clbmsk)];
              pos += r & 15;
              var s = r >> 4;
              if (s < 16) {
                ldt[i2++] = s;
              } else {
                var c = 0, n = 0;
                if (s == 16)
                  n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i2 - 1];
                else if (s == 17)
                  n = 3 + bits(dat, pos, 7), pos += 3;
                else if (s == 18)
                  n = 11 + bits(dat, pos, 127), pos += 7;
                while (n--)
                  ldt[i2++] = c;
              }
            }
            var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
            lbt = max(lt);
            dbt = max(dt);
            lm = hMap(lt, lbt, 1);
            dm = hMap(dt, dbt, 1);
          } else
            err(1);
          if (pos > tbts) {
            if (noSt)
              err(0);
            break;
          }
        }
        if (resize)
          cbuf(bt + 131072);
        var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
        var lpos = pos;
        for (; ; lpos = pos) {
          var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
          pos += c & 15;
          if (pos > tbts) {
            if (noSt)
              err(0);
            break;
          }
          if (!c)
            err(2);
          if (sym < 256)
            buf[bt++] = sym;
          else if (sym == 256) {
            lpos = pos, lm = null;
            break;
          } else {
            var add = sym - 254;
            if (sym > 264) {
              var i2 = sym - 257, b = fleb[i2];
              add = bits(dat, pos, (1 << b) - 1) + fl[i2];
              pos += b;
            }
            var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
            if (!d)
              err(3);
            pos += d & 15;
            var dt = fd[dsym];
            if (dsym > 3) {
              var b = fdeb[dsym];
              dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
            }
            if (pos > tbts) {
              if (noSt)
                err(0);
              break;
            }
            if (resize)
              cbuf(bt + 131072);
            var end = bt + add;
            if (bt < dt) {
              var shift = dl - dt, dend = Math.min(dt, end);
              if (shift + bt < 0)
                err(3);
              for (; bt < dend; ++bt)
                buf[bt] = dict[shift + bt];
            }
            for (; bt < end; ++bt)
              buf[bt] = buf[bt - dt];
          }
        }
        st.l = lm, st.p = lpos, st.b = bt, st.f = final;
        if (lm)
          final = 1, st.m = lbt, st.d = dm, st.n = dbt;
      } while (!final);
      return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
    };
    var wbits = function(d, p, v) {
      v <<= p & 7;
      var o = p / 8 | 0;
      d[o] |= v;
      d[o + 1] |= v >> 8;
    };
    var wbits16 = function(d, p, v) {
      v <<= p & 7;
      var o = p / 8 | 0;
      d[o] |= v;
      d[o + 1] |= v >> 8;
      d[o + 2] |= v >> 16;
    };
    var hTree = function(d, mb) {
      var t = [];
      for (var i2 = 0; i2 < d.length; ++i2) {
        if (d[i2])
          t.push({ s: i2, f: d[i2] });
      }
      var s = t.length;
      var t2 = t.slice();
      if (!s)
        return { t: et, l: 0 };
      if (s == 1) {
        var v = new u8(t[0].s + 1);
        v[t[0].s] = 1;
        return { t: v, l: 1 };
      }
      t.sort(function(a, b) {
        return a.f - b.f;
      });
      t.push({ s: -1, f: 25001 });
      var l = t[0], r = t[1], i0 = 0, i1 = 1, i22 = 2;
      t[0] = { s: -1, f: l.f + r.f, l, r };
      while (i1 != s - 1) {
        l = t[t[i0].f < t[i22].f ? i0++ : i22++];
        r = t[i0 != i1 && t[i0].f < t[i22].f ? i0++ : i22++];
        t[i1++] = { s: -1, f: l.f + r.f, l, r };
      }
      var maxSym = t2[0].s;
      for (var i2 = 1; i2 < s; ++i2) {
        if (t2[i2].s > maxSym)
          maxSym = t2[i2].s;
      }
      var tr = new u16(maxSym + 1);
      var mbt = ln(t[i1 - 1], tr, 0);
      if (mbt > mb) {
        var i2 = 0, dt = 0;
        var lft = mbt - mb, cst = 1 << lft;
        t2.sort(function(a, b) {
          return tr[b.s] - tr[a.s] || a.f - b.f;
        });
        for (; i2 < s; ++i2) {
          var i2_1 = t2[i2].s;
          if (tr[i2_1] > mb) {
            dt += cst - (1 << mbt - tr[i2_1]);
            tr[i2_1] = mb;
          } else
            break;
        }
        dt >>= lft;
        while (dt > 0) {
          var i2_2 = t2[i2].s;
          if (tr[i2_2] < mb)
            dt -= 1 << mb - tr[i2_2]++ - 1;
          else
            ++i2;
        }
        for (; i2 >= 0 && dt; --i2) {
          var i2_3 = t2[i2].s;
          if (tr[i2_3] == mb) {
            --tr[i2_3];
            ++dt;
          }
        }
        mbt = mb;
      }
      return { t: new u8(tr), l: mbt };
    };
    var ln = function(n, l, d) {
      return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
    };
    var lc = function(c) {
      var s = c.length;
      while (s && !c[--s])
        ;
      var cl = new u16(++s);
      var cli = 0, cln = c[0], cls = 1;
      var w = function(v) {
        cl[cli++] = v;
      };
      for (var i2 = 1; i2 <= s; ++i2) {
        if (c[i2] == cln && i2 != s)
          ++cls;
        else {
          if (!cln && cls > 2) {
            for (; cls > 138; cls -= 138)
              w(32754);
            if (cls > 2) {
              w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
              cls = 0;
            }
          } else if (cls > 3) {
            w(cln), --cls;
            for (; cls > 6; cls -= 6)
              w(8304);
            if (cls > 2)
              w(cls - 3 << 5 | 8208), cls = 0;
          }
          while (cls--)
            w(cln);
          cls = 1;
          cln = c[i2];
        }
      }
      return { c: cl.subarray(0, cli), n: s };
    };
    var clen = function(cf, cl) {
      var l = 0;
      for (var i2 = 0; i2 < cl.length; ++i2)
        l += cf[i2] * cl[i2];
      return l;
    };
    var wfblk = function(out, pos, dat) {
      var s = dat.length;
      var o = shft(pos + 2);
      out[o] = s & 255;
      out[o + 1] = s >> 8;
      out[o + 2] = out[o] ^ 255;
      out[o + 3] = out[o + 1] ^ 255;
      for (var i2 = 0; i2 < s; ++i2)
        out[o + i2 + 4] = dat[i2];
      return (o + 4 + s) * 8;
    };
    var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
      wbits(out, p++, final);
      ++lf[256];
      var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
      var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
      var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
      var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
      var lcfreq = new u16(19);
      for (var i2 = 0; i2 < lclt.length; ++i2)
        ++lcfreq[lclt[i2] & 31];
      for (var i2 = 0; i2 < lcdt.length; ++i2)
        ++lcfreq[lcdt[i2] & 31];
      var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
      var nlcc = 19;
      for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
        ;
      var flen = bl + 5 << 3;
      var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
      var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
      if (bs >= 0 && flen <= ftlen && flen <= dtlen)
        return wfblk(out, p, dat.subarray(bs, bs + bl));
      var lm, ll, dm, dl;
      wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
      if (dtlen < ftlen) {
        lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
        var llm = hMap(lct, mlcb, 0);
        wbits(out, p, nlc - 257);
        wbits(out, p + 5, ndc - 1);
        wbits(out, p + 10, nlcc - 4);
        p += 14;
        for (var i2 = 0; i2 < nlcc; ++i2)
          wbits(out, p + 3 * i2, lct[clim[i2]]);
        p += 3 * nlcc;
        var lcts = [lclt, lcdt];
        for (var it = 0; it < 2; ++it) {
          var clct = lcts[it];
          for (var i2 = 0; i2 < clct.length; ++i2) {
            var len = clct[i2] & 31;
            wbits(out, p, llm[len]), p += lct[len];
            if (len > 15)
              wbits(out, p, clct[i2] >> 5 & 127), p += clct[i2] >> 12;
          }
        }
      } else {
        lm = flm, ll = flt, dm = fdm, dl = fdt;
      }
      for (var i2 = 0; i2 < li; ++i2) {
        var sym = syms[i2];
        if (sym > 255) {
          var len = sym >> 18 & 31;
          wbits16(out, p, lm[len + 257]), p += ll[len + 257];
          if (len > 7)
            wbits(out, p, sym >> 23 & 31), p += fleb[len];
          var dst = sym & 31;
          wbits16(out, p, dm[dst]), p += dl[dst];
          if (dst > 3)
            wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
        } else {
          wbits16(out, p, lm[sym]), p += ll[sym];
        }
      }
      wbits16(out, p, lm[256]);
      return p + ll[256];
    };
    var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
    var et = /* @__PURE__ */ new u8(0);
    var dflt = function(dat, lvl, plvl, pre, post, st) {
      var s = st.z || dat.length;
      var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
      var w = o.subarray(pre, o.length - post);
      var lst = st.l;
      var pos = (st.r || 0) & 7;
      if (lvl) {
        if (pos)
          w[0] = st.r >> 3;
        var opt = deo[lvl - 1];
        var n = opt >> 13, c = opt & 8191;
        var msk_1 = (1 << plvl) - 1;
        var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
        var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
        var hsh = function(i3) {
          return (dat[i3] ^ dat[i3 + 1] << bs1_1 ^ dat[i3 + 2] << bs2_1) & msk_1;
        };
        var syms = new i32(25e3);
        var lf = new u16(288), df = new u16(32);
        var lc_1 = 0, eb = 0, i2 = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
        for (; i2 + 2 < s; ++i2) {
          var hv = hsh(i2);
          var imod = i2 & 32767, pimod = head[hv];
          prev[imod] = pimod;
          head[hv] = imod;
          if (wi <= i2) {
            var rem = s - i2;
            if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
              pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i2 - bs, pos);
              li = lc_1 = eb = 0, bs = i2;
              for (var j = 0; j < 286; ++j)
                lf[j] = 0;
              for (var j = 0; j < 30; ++j)
                df[j] = 0;
            }
            var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
            if (rem > 2 && hv == hsh(i2 - dif)) {
              var maxn = Math.min(n, rem) - 1;
              var maxd = Math.min(32767, i2);
              var ml = Math.min(258, rem);
              while (dif <= maxd && --ch_1 && imod != pimod) {
                if (dat[i2 + l] == dat[i2 + l - dif]) {
                  var nl = 0;
                  for (; nl < ml && dat[i2 + nl] == dat[i2 + nl - dif]; ++nl)
                    ;
                  if (nl > l) {
                    l = nl, d = dif;
                    if (nl > maxn)
                      break;
                    var mmd = Math.min(dif, nl - 2);
                    var md = 0;
                    for (var j = 0; j < mmd; ++j) {
                      var ti = i2 - dif + j & 32767;
                      var pti = prev[ti];
                      var cd = ti - pti & 32767;
                      if (cd > md)
                        md = cd, pimod = ti;
                    }
                  }
                }
                imod = pimod, pimod = prev[imod];
                dif += imod - pimod & 32767;
              }
            }
            if (d) {
              syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
              var lin = revfl[l] & 31, din = revfd[d] & 31;
              eb += fleb[lin] + fdeb[din];
              ++lf[257 + lin];
              ++df[din];
              wi = i2 + l;
              ++lc_1;
            } else {
              syms[li++] = dat[i2];
              ++lf[dat[i2]];
            }
          }
        }
        for (i2 = Math.max(i2, wi); i2 < s; ++i2) {
          syms[li++] = dat[i2];
          ++lf[dat[i2]];
        }
        pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i2 - bs, pos);
        if (!lst) {
          st.r = pos & 7 | w[pos / 8 | 0] << 3;
          pos -= 7;
          st.h = head, st.p = prev, st.i = i2, st.w = wi;
        }
      } else {
        for (var i2 = st.w || 0; i2 < s + lst; i2 += 65535) {
          var e = i2 + 65535;
          if (e >= s) {
            w[pos / 8 | 0] = lst;
            e = s;
          }
          pos = wfblk(w, pos + 1, dat.subarray(i2, e));
        }
        st.i = s;
      }
      return slc(o, 0, pre + shft(pos) + post);
    };
    var crct = /* @__PURE__ */ (function() {
      var t = new Int32Array(256);
      for (var i2 = 0; i2 < 256; ++i2) {
        var c = i2, k = 9;
        while (--k)
          c = (c & 1 && -306674912) ^ c >>> 1;
        t[i2] = c;
      }
      return t;
    })();
    var crc = function() {
      var c = -1;
      return {
        p: function(d) {
          var cr = c;
          for (var i2 = 0; i2 < d.length; ++i2)
            cr = crct[cr & 255 ^ d[i2]] ^ cr >>> 8;
          c = cr;
        },
        d: function() {
          return ~c;
        }
      };
    };
    var adler = function() {
      var a = 1, b = 0;
      return {
        p: function(d) {
          var n = a, m = b;
          var l = d.length | 0;
          for (var i2 = 0; i2 != l; ) {
            var e = Math.min(i2 + 2655, l);
            for (; i2 < e; ++i2)
              m += n += d[i2];
            n = (n & 65535) + 15 * (n >> 16), m = (m & 65535) + 15 * (m >> 16);
          }
          a = n, b = m;
        },
        d: function() {
          a %= 65521, b %= 65521;
          return (a & 255) << 24 | (a & 65280) << 8 | (b & 255) << 8 | b >> 8;
        }
      };
    };
    var dopt = function(dat, opt, pre, post, st) {
      if (!st) {
        st = { l: 1 };
        if (opt.dictionary) {
          var dict = opt.dictionary.subarray(-32768);
          var newDat = new u8(dict.length + dat.length);
          newDat.set(dict);
          newDat.set(dat, dict.length);
          dat = newDat;
          st.w = dict.length;
        }
      }
      return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
    };
    var mrg = function(a, b) {
      var o = {};
      for (var k in a)
        o[k] = a[k];
      for (var k in b)
        o[k] = b[k];
      return o;
    };
    var wcln = function(fn, fnStr, td2) {
      var dt = fn();
      var st = fn.toString();
      var ks = st.slice(st.indexOf("[") + 1, st.lastIndexOf("]")).replace(/\s+/g, "").split(",");
      for (var i2 = 0; i2 < dt.length; ++i2) {
        var v = dt[i2], k = ks[i2];
        if (typeof v == "function") {
          fnStr += ";" + k + "=";
          var st_1 = v.toString();
          if (v.prototype) {
            if (st_1.indexOf("[native code]") != -1) {
              var spInd = st_1.indexOf(" ", 8) + 1;
              fnStr += st_1.slice(spInd, st_1.indexOf("(", spInd));
            } else {
              fnStr += st_1;
              for (var t in v.prototype)
                fnStr += ";" + k + ".prototype." + t + "=" + v.prototype[t].toString();
            }
          } else
            fnStr += st_1;
        } else
          td2[k] = v;
      }
      return fnStr;
    };
    var ch = [];
    var cbfs = function(v) {
      var tl = [];
      for (var k in v) {
        if (v[k].buffer) {
          tl.push((v[k] = new v[k].constructor(v[k])).buffer);
        }
      }
      return tl;
    };
    var wrkr = function(fns, init, id, cb) {
      if (!ch[id]) {
        var fnStr = "", td_1 = {}, m = fns.length - 1;
        for (var i2 = 0; i2 < m; ++i2)
          fnStr = wcln(fns[i2], fnStr, td_1);
        ch[id] = { c: wcln(fns[m], fnStr, td_1), e: td_1 };
      }
      var td2 = mrg({}, ch[id].e);
      return (0, node_worker_1.default)(ch[id].c + ";onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage=" + init.toString() + "}", id, td2, cbfs(td2), cb);
    };
    var bInflt = function() {
      return [u8, u16, i32, fleb, fdeb, clim, fl, fd, flrm, fdrm, rev, ec, hMap, max, bits, bits16, shft, slc, err, inflt, inflateSync, pbf, gopt];
    };
    var bDflt = function() {
      return [u8, u16, i32, fleb, fdeb, clim, revfl, revfd, flm, flt, fdm, fdt, rev, deo, et, hMap, wbits, wbits16, hTree, ln, lc, clen, wfblk, wblk, shft, slc, dflt, dopt, deflateSync, pbf];
    };
    var gze = function() {
      return [gzh, gzhl, wbytes, crc, crct];
    };
    var guze = function() {
      return [gzs, gzl];
    };
    var zle = function() {
      return [zlh, wbytes, adler];
    };
    var zule = function() {
      return [zls];
    };
    var pbf = function(msg) {
      return postMessage(msg, [msg.buffer]);
    };
    var gopt = function(o) {
      return o && {
        out: o.size && new u8(o.size),
        dictionary: o.dictionary
      };
    };
    var cbify = function(dat, opts, fns, init, id, cb) {
      var w = wrkr(fns, init, id, function(err2, dat2) {
        w.terminate();
        cb(err2, dat2);
      });
      w.postMessage([dat, opts], opts.consume ? [dat.buffer] : []);
      return function() {
        w.terminate();
      };
    };
    var astrm = function(strm) {
      strm.ondata = function(dat, final) {
        return postMessage([dat, final], [dat.buffer]);
      };
      return function(ev) {
        if (ev.data[0]) {
          strm.push(ev.data[0], ev.data[1]);
          postMessage([ev.data[0].length]);
        } else
          strm.flush(ev.data[1]);
      };
    };
    var astrmify = function(fns, strm, opts, init, id, flush, ext) {
      var t;
      var w = wrkr(fns, init, id, function(err2, dat) {
        if (err2)
          w.terminate(), strm.ondata.call(strm, err2);
        else if (!Array.isArray(dat))
          ext(dat);
        else if (dat.length == 1) {
          strm.queuedSize -= dat[0];
          if (strm.ondrain)
            strm.ondrain(dat[0]);
        } else {
          if (dat[1])
            w.terminate();
          strm.ondata.call(strm, err2, dat[0], dat[1]);
        }
      });
      w.postMessage(opts);
      strm.queuedSize = 0;
      strm.push = function(d, f) {
        if (!strm.ondata)
          err(5);
        if (t)
          strm.ondata(err(4, 0, 1), null, !!f);
        strm.queuedSize += d.length;
        w.postMessage([d, t = f], d.buffer instanceof ArrayBuffer ? [d.buffer] : []);
      };
      strm.terminate = function() {
        w.terminate();
      };
      if (flush) {
        strm.flush = function(sync) {
          w.postMessage([0, sync]);
        };
      }
    };
    var b2 = function(d, b) {
      return d[b] | d[b + 1] << 8;
    };
    var b4 = function(d, b) {
      return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
    };
    var b8 = function(d, b) {
      return b4(d, b) + b4(d, b + 4) * 4294967296;
    };
    var wbytes = function(d, b, v) {
      for (; v; ++b)
        d[b] = v, v >>>= 8;
    };
    var gzh = function(c, o) {
      var fn = o.filename;
      c[0] = 31, c[1] = 139, c[2] = 8, c[8] = o.level < 2 ? 4 : o.level == 9 ? 2 : 0, c[9] = 3;
      if (o.mtime != 0)
        wbytes(c, 4, Math.floor(new Date(o.mtime || Date.now()) / 1e3));
      if (fn) {
        c[3] = 8;
        for (var i2 = 0; i2 <= fn.length; ++i2)
          c[i2 + 10] = fn.charCodeAt(i2);
      }
    };
    var gzs = function(d) {
      if (d[0] != 31 || d[1] != 139 || d[2] != 8)
        err(6, "invalid gzip data");
      var flg = d[3];
      var st = 10;
      if (flg & 4)
        st += (d[10] | d[11] << 8) + 2;
      for (var zs = (flg >> 3 & 1) + (flg >> 4 & 1); zs > 0; zs -= !d[st++])
        ;
      return st + (flg & 2);
    };
    var gzl = function(d) {
      var l = d.length;
      return (d[l - 4] | d[l - 3] << 8 | d[l - 2] << 16 | d[l - 1] << 24) >>> 0;
    };
    var gzhl = function(o) {
      return 10 + (o.filename ? o.filename.length + 1 : 0);
    };
    var zlh = function(c, o) {
      var lv = o.level, fl2 = lv == 0 ? 0 : lv < 6 ? 1 : lv == 9 ? 3 : 2;
      c[0] = 120, c[1] = fl2 << 6 | (o.dictionary && 32);
      c[1] |= 31 - (c[0] << 8 | c[1]) % 31;
      if (o.dictionary) {
        var h = adler();
        h.p(o.dictionary);
        wbytes(c, 2, h.d());
      }
    };
    var zls = function(d, dict) {
      if ((d[0] & 15) != 8 || d[0] >> 4 > 7 || (d[0] << 8 | d[1]) % 31)
        err(6, "invalid zlib data");
      if ((d[1] >> 5 & 1) == +!dict)
        err(6, "invalid zlib data: " + (d[1] & 32 ? "need" : "unexpected") + " dictionary");
      return (d[1] >> 3 & 4) + 2;
    };
    function StrmOpt(opts, cb) {
      if (typeof opts == "function")
        cb = opts, opts = {};
      this.ondata = cb;
      return opts;
    }
    var Deflate = /* @__PURE__ */ (function() {
      function Deflate2(opts, cb) {
        if (typeof opts == "function")
          cb = opts, opts = {};
        this.ondata = cb;
        this.o = opts || {};
        this.s = { l: 0, i: 32768, w: 32768, z: 32768 };
        this.b = new u8(98304);
        if (this.o.dictionary) {
          var dict = this.o.dictionary.subarray(-32768);
          this.b.set(dict, 32768 - dict.length);
          this.s.i = 32768 - dict.length;
        }
      }
      Deflate2.prototype.p = function(c, f) {
        this.ondata(dopt(c, this.o, 0, 0, this.s), f);
      };
      Deflate2.prototype.push = function(chunk, final) {
        if (!this.ondata)
          err(5);
        if (this.s.l)
          err(4);
        var endLen = chunk.length + this.s.z;
        if (endLen > this.b.length) {
          if (endLen > 2 * this.b.length - 32768) {
            var newBuf = new u8(endLen & -32768);
            newBuf.set(this.b.subarray(0, this.s.z));
            this.b = newBuf;
          }
          var split = this.b.length - this.s.z;
          this.b.set(chunk.subarray(0, split), this.s.z);
          this.s.z = this.b.length;
          this.p(this.b, false);
          this.b.set(this.b.subarray(-32768));
          this.b.set(chunk.subarray(split), 32768);
          this.s.z = chunk.length - split + 32768;
          this.s.i = 32766, this.s.w = 32768;
        } else {
          this.b.set(chunk, this.s.z);
          this.s.z += chunk.length;
        }
        this.s.l = final & 1;
        if (this.s.z > this.s.w + 8191 || final) {
          this.p(this.b, final || false);
          this.s.w = this.s.i, this.s.i -= 2;
        }
        if (final) {
          this.s = this.o = {};
          this.b = et;
        }
      };
      Deflate2.prototype.flush = function(sync) {
        if (!this.ondata)
          err(5);
        if (this.s.l)
          err(4);
        this.p(this.b, false);
        this.s.w = this.s.i, this.s.i -= 2;
        if (sync) {
          var c = new u8(6);
          c[0] = this.s.r >> 3;
          var ep = wfblk(c, this.s.r, et);
          this.s.r = 0;
          this.ondata(c.subarray(0, ep >> 3), false);
        }
      };
      return Deflate2;
    })();
    exports2.Deflate = Deflate;
    var AsyncDeflate = /* @__PURE__ */ (function() {
      function AsyncDeflate2(opts, cb) {
        astrmify([
          bDflt,
          function() {
            return [astrm, Deflate];
          }
        ], this, StrmOpt.call(this, opts, cb), function(ev) {
          var strm = new Deflate(ev.data);
          onmessage = astrm(strm);
        }, 6, 1);
      }
      return AsyncDeflate2;
    })();
    exports2.AsyncDeflate = AsyncDeflate;
    function deflate(data, opts, cb) {
      if (!cb)
        cb = opts, opts = {};
      if (typeof cb != "function")
        err(7);
      return cbify(data, opts, [
        bDflt
      ], function(ev) {
        return pbf(deflateSync(ev.data[0], ev.data[1]));
      }, 0, cb);
    }
    function deflateSync(data, opts) {
      return dopt(data, opts || {}, 0, 0);
    }
    var Inflate = /* @__PURE__ */ (function() {
      function Inflate2(opts, cb) {
        if (typeof opts == "function")
          cb = opts, opts = {};
        this.ondata = cb;
        var dict = opts && opts.dictionary && opts.dictionary.subarray(-32768);
        this.s = { i: 0, b: dict ? dict.length : 0 };
        this.o = new u8(32768);
        this.p = new u8(0);
        if (dict)
          this.o.set(dict);
      }
      Inflate2.prototype.e = function(c) {
        if (!this.ondata)
          err(5);
        if (this.d)
          err(4);
        if (!this.p.length)
          this.p = c;
        else if (c.length) {
          var n = new u8(this.p.length + c.length);
          n.set(this.p), n.set(c, this.p.length), this.p = n;
        }
      };
      Inflate2.prototype.c = function(final) {
        this.s.i = +(this.d = final || false);
        var bts = this.s.b;
        var dt = inflt(this.p, this.s, this.o);
        this.ondata(slc(dt, bts, this.s.b), this.d);
        this.o = slc(dt, this.s.b - 32768), this.s.b = this.o.length;
        this.p = slc(this.p, this.s.p / 8 | 0), this.s.p &= 7;
      };
      Inflate2.prototype.push = function(chunk, final) {
        this.e(chunk), this.c(final);
      };
      return Inflate2;
    })();
    exports2.Inflate = Inflate;
    var AsyncInflate = /* @__PURE__ */ (function() {
      function AsyncInflate2(opts, cb) {
        astrmify([
          bInflt,
          function() {
            return [astrm, Inflate];
          }
        ], this, StrmOpt.call(this, opts, cb), function(ev) {
          var strm = new Inflate(ev.data);
          onmessage = astrm(strm);
        }, 7, 0);
      }
      return AsyncInflate2;
    })();
    exports2.AsyncInflate = AsyncInflate;
    function inflate(data, opts, cb) {
      if (!cb)
        cb = opts, opts = {};
      if (typeof cb != "function")
        err(7);
      return cbify(data, opts, [
        bInflt
      ], function(ev) {
        return pbf(inflateSync(ev.data[0], gopt(ev.data[1])));
      }, 1, cb);
    }
    function inflateSync(data, opts) {
      return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
    }
    var Gzip = /* @__PURE__ */ (function() {
      function Gzip2(opts, cb) {
        this.c = crc();
        this.l = 0;
        this.v = 1;
        Deflate.call(this, opts, cb);
      }
      Gzip2.prototype.push = function(chunk, final) {
        this.c.p(chunk);
        this.l += chunk.length;
        Deflate.prototype.push.call(this, chunk, final);
      };
      Gzip2.prototype.p = function(c, f) {
        var raw = dopt(c, this.o, this.v && gzhl(this.o), f && 8, this.s);
        if (this.v)
          gzh(raw, this.o), this.v = 0;
        if (f)
          wbytes(raw, raw.length - 8, this.c.d()), wbytes(raw, raw.length - 4, this.l);
        this.ondata(raw, f);
      };
      Gzip2.prototype.flush = function(sync) {
        Deflate.prototype.flush.call(this, sync);
      };
      return Gzip2;
    })();
    exports2.Gzip = Gzip;
    exports2.Compress = Gzip;
    var AsyncGzip = /* @__PURE__ */ (function() {
      function AsyncGzip2(opts, cb) {
        astrmify([
          bDflt,
          gze,
          function() {
            return [astrm, Deflate, Gzip];
          }
        ], this, StrmOpt.call(this, opts, cb), function(ev) {
          var strm = new Gzip(ev.data);
          onmessage = astrm(strm);
        }, 8, 1);
      }
      return AsyncGzip2;
    })();
    exports2.AsyncGzip = AsyncGzip;
    exports2.AsyncCompress = AsyncGzip;
    function gzip(data, opts, cb) {
      if (!cb)
        cb = opts, opts = {};
      if (typeof cb != "function")
        err(7);
      return cbify(data, opts, [
        bDflt,
        gze,
        function() {
          return [gzipSync];
        }
      ], function(ev) {
        return pbf(gzipSync(ev.data[0], ev.data[1]));
      }, 2, cb);
    }
    function gzipSync(data, opts) {
      if (!opts)
        opts = {};
      var c = crc(), l = data.length;
      c.p(data);
      var d = dopt(data, opts, gzhl(opts), 8), s = d.length;
      return gzh(d, opts), wbytes(d, s - 8, c.d()), wbytes(d, s - 4, l), d;
    }
    var Gunzip = /* @__PURE__ */ (function() {
      function Gunzip2(opts, cb) {
        this.v = 1;
        this.r = 0;
        Inflate.call(this, opts, cb);
      }
      Gunzip2.prototype.push = function(chunk, final) {
        Inflate.prototype.e.call(this, chunk);
        this.r += chunk.length;
        if (this.v) {
          var p = this.p.subarray(this.v - 1);
          var s = p.length > 3 ? gzs(p) : 4;
          if (s > p.length) {
            if (!final)
              return;
          } else if (this.v > 1 && this.onmember) {
            this.onmember(this.r - p.length);
          }
          this.p = p.subarray(s), this.v = 0;
        }
        Inflate.prototype.c.call(this, 0);
        if (this.s.f && !this.s.l) {
          this.v = shft(this.s.p) + 9;
          this.s = { i: 0 };
          this.o = new u8(0);
          this.push(new u8(0), final);
        } else if (final) {
          Inflate.prototype.c.call(this, final);
        }
      };
      return Gunzip2;
    })();
    exports2.Gunzip = Gunzip;
    var AsyncGunzip = /* @__PURE__ */ (function() {
      function AsyncGunzip2(opts, cb) {
        var _this = this;
        astrmify([
          bInflt,
          guze,
          function() {
            return [astrm, Inflate, Gunzip];
          }
        ], this, StrmOpt.call(this, opts, cb), function(ev) {
          var strm = new Gunzip(ev.data);
          strm.onmember = function(offset) {
            return postMessage(offset);
          };
          onmessage = astrm(strm);
        }, 9, 0, function(offset) {
          return _this.onmember && _this.onmember(offset);
        });
      }
      return AsyncGunzip2;
    })();
    exports2.AsyncGunzip = AsyncGunzip;
    function gunzip(data, opts, cb) {
      if (!cb)
        cb = opts, opts = {};
      if (typeof cb != "function")
        err(7);
      return cbify(data, opts, [
        bInflt,
        guze,
        function() {
          return [gunzipSync];
        }
      ], function(ev) {
        return pbf(gunzipSync(ev.data[0], ev.data[1]));
      }, 3, cb);
    }
    function gunzipSync(data, opts) {
      var st = gzs(data);
      if (st + 8 > data.length)
        err(6, "invalid gzip data");
      return inflt(data.subarray(st, -8), { i: 2 }, opts && opts.out || new u8(gzl(data)), opts && opts.dictionary);
    }
    var Zlib = /* @__PURE__ */ (function() {
      function Zlib2(opts, cb) {
        this.c = adler();
        this.v = 1;
        Deflate.call(this, opts, cb);
      }
      Zlib2.prototype.push = function(chunk, final) {
        this.c.p(chunk);
        Deflate.prototype.push.call(this, chunk, final);
      };
      Zlib2.prototype.p = function(c, f) {
        var raw = dopt(c, this.o, this.v && (this.o.dictionary ? 6 : 2), f && 4, this.s);
        if (this.v)
          zlh(raw, this.o), this.v = 0;
        if (f)
          wbytes(raw, raw.length - 4, this.c.d());
        this.ondata(raw, f);
      };
      Zlib2.prototype.flush = function(sync) {
        Deflate.prototype.flush.call(this, sync);
      };
      return Zlib2;
    })();
    exports2.Zlib = Zlib;
    var AsyncZlib = /* @__PURE__ */ (function() {
      function AsyncZlib2(opts, cb) {
        astrmify([
          bDflt,
          zle,
          function() {
            return [astrm, Deflate, Zlib];
          }
        ], this, StrmOpt.call(this, opts, cb), function(ev) {
          var strm = new Zlib(ev.data);
          onmessage = astrm(strm);
        }, 10, 1);
      }
      return AsyncZlib2;
    })();
    exports2.AsyncZlib = AsyncZlib;
    function zlib(data, opts, cb) {
      if (!cb)
        cb = opts, opts = {};
      if (typeof cb != "function")
        err(7);
      return cbify(data, opts, [
        bDflt,
        zle,
        function() {
          return [zlibSync];
        }
      ], function(ev) {
        return pbf(zlibSync(ev.data[0], ev.data[1]));
      }, 4, cb);
    }
    function zlibSync(data, opts) {
      if (!opts)
        opts = {};
      var a = adler();
      a.p(data);
      var d = dopt(data, opts, opts.dictionary ? 6 : 2, 4);
      return zlh(d, opts), wbytes(d, d.length - 4, a.d()), d;
    }
    var Unzlib = /* @__PURE__ */ (function() {
      function Unzlib2(opts, cb) {
        Inflate.call(this, opts, cb);
        this.v = opts && opts.dictionary ? 2 : 1;
      }
      Unzlib2.prototype.push = function(chunk, final) {
        Inflate.prototype.e.call(this, chunk);
        if (this.v) {
          if (this.p.length < 6 && !final)
            return;
          this.p = this.p.subarray(zls(this.p, this.v - 1)), this.v = 0;
        }
        if (final) {
          if (this.p.length < 4)
            err(6, "invalid zlib data");
          this.p = this.p.subarray(0, -4);
        }
        Inflate.prototype.c.call(this, final);
      };
      return Unzlib2;
    })();
    exports2.Unzlib = Unzlib;
    var AsyncUnzlib = /* @__PURE__ */ (function() {
      function AsyncUnzlib2(opts, cb) {
        astrmify([
          bInflt,
          zule,
          function() {
            return [astrm, Inflate, Unzlib];
          }
        ], this, StrmOpt.call(this, opts, cb), function(ev) {
          var strm = new Unzlib(ev.data);
          onmessage = astrm(strm);
        }, 11, 0);
      }
      return AsyncUnzlib2;
    })();
    exports2.AsyncUnzlib = AsyncUnzlib;
    function unzlib(data, opts, cb) {
      if (!cb)
        cb = opts, opts = {};
      if (typeof cb != "function")
        err(7);
      return cbify(data, opts, [
        bInflt,
        zule,
        function() {
          return [unzlibSync];
        }
      ], function(ev) {
        return pbf(unzlibSync(ev.data[0], gopt(ev.data[1])));
      }, 5, cb);
    }
    function unzlibSync(data, opts) {
      return inflt(data.subarray(zls(data, opts && opts.dictionary), -4), { i: 2 }, opts && opts.out, opts && opts.dictionary);
    }
    var Decompress = /* @__PURE__ */ (function() {
      function Decompress2(opts, cb) {
        this.o = StrmOpt.call(this, opts, cb) || {};
        this.G = Gunzip;
        this.I = Inflate;
        this.Z = Unzlib;
      }
      Decompress2.prototype.i = function() {
        var _this = this;
        this.s.ondata = function(dat, final) {
          _this.ondata(dat, final);
        };
      };
      Decompress2.prototype.push = function(chunk, final) {
        if (!this.ondata)
          err(5);
        if (!this.s) {
          if (this.p && this.p.length) {
            var n = new u8(this.p.length + chunk.length);
            n.set(this.p), n.set(chunk, this.p.length);
          } else
            this.p = chunk;
          if (this.p.length > 2) {
            this.s = this.p[0] == 31 && this.p[1] == 139 && this.p[2] == 8 ? new this.G(this.o) : (this.p[0] & 15) != 8 || this.p[0] >> 4 > 7 || (this.p[0] << 8 | this.p[1]) % 31 ? new this.I(this.o) : new this.Z(this.o);
            this.i();
            this.s.push(this.p, final);
            this.p = null;
          }
        } else
          this.s.push(chunk, final);
      };
      return Decompress2;
    })();
    exports2.Decompress = Decompress;
    var AsyncDecompress = /* @__PURE__ */ (function() {
      function AsyncDecompress2(opts, cb) {
        Decompress.call(this, opts, cb);
        this.queuedSize = 0;
        this.G = AsyncGunzip;
        this.I = AsyncInflate;
        this.Z = AsyncUnzlib;
      }
      AsyncDecompress2.prototype.i = function() {
        var _this = this;
        this.s.ondata = function(err2, dat, final) {
          _this.ondata(err2, dat, final);
        };
        this.s.ondrain = function(size) {
          _this.queuedSize -= size;
          if (_this.ondrain)
            _this.ondrain(size);
        };
      };
      AsyncDecompress2.prototype.push = function(chunk, final) {
        this.queuedSize += chunk.length;
        Decompress.prototype.push.call(this, chunk, final);
      };
      return AsyncDecompress2;
    })();
    exports2.AsyncDecompress = AsyncDecompress;
    function decompress(data, opts, cb) {
      if (!cb)
        cb = opts, opts = {};
      if (typeof cb != "function")
        err(7);
      return data[0] == 31 && data[1] == 139 && data[2] == 8 ? gunzip(data, opts, cb) : (data[0] & 15) != 8 || data[0] >> 4 > 7 || (data[0] << 8 | data[1]) % 31 ? inflate(data, opts, cb) : unzlib(data, opts, cb);
    }
    function decompressSync(data, opts) {
      return data[0] == 31 && data[1] == 139 && data[2] == 8 ? gunzipSync(data, opts) : (data[0] & 15) != 8 || data[0] >> 4 > 7 || (data[0] << 8 | data[1]) % 31 ? inflateSync(data, opts) : unzlibSync(data, opts);
    }
    var fltn = function(d, p, t, o) {
      for (var k in d) {
        var val = d[k], n = p + k, op = o;
        if (Array.isArray(val))
          op = mrg(o, val[1]), val = val[0];
        if (ArrayBuffer.isView(val))
          t[n] = [val, op];
        else {
          t[n += "/"] = [new u8(0), op];
          fltn(val, n, t, o);
        }
      }
    };
    var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
    var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
    var tds = 0;
    try {
      td.decode(et, { stream: true });
      tds = 1;
    } catch (e) {
    }
    var dutf8 = function(d) {
      for (var r = "", i2 = 0; ; ) {
        var c = d[i2++];
        var eb = (c > 127) + (c > 223) + (c > 239);
        if (i2 + eb > d.length)
          return { s: r, r: slc(d, i2 - 1) };
        if (!eb)
          r += String.fromCharCode(c);
        else if (eb == 3) {
          c = ((c & 15) << 18 | (d[i2++] & 63) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
        } else if (eb & 1)
          r += String.fromCharCode((c & 31) << 6 | d[i2++] & 63);
        else
          r += String.fromCharCode((c & 15) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63);
      }
    };
    var DecodeUTF8 = /* @__PURE__ */ (function() {
      function DecodeUTF82(cb) {
        this.ondata = cb;
        if (tds)
          this.t = new TextDecoder();
        else
          this.p = et;
      }
      DecodeUTF82.prototype.push = function(chunk, final) {
        if (!this.ondata)
          err(5);
        final = !!final;
        if (this.t) {
          this.ondata(this.t.decode(chunk, { stream: true }), final);
          if (final) {
            if (this.t.decode().length)
              err(8);
            this.t = null;
          }
          return;
        }
        if (!this.p)
          err(4);
        var dat = new u8(this.p.length + chunk.length);
        dat.set(this.p);
        dat.set(chunk, this.p.length);
        var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
        if (final) {
          if (r.length)
            err(8);
          this.p = null;
        } else
          this.p = r;
        this.ondata(s, final);
      };
      return DecodeUTF82;
    })();
    exports2.DecodeUTF8 = DecodeUTF8;
    var EncodeUTF8 = /* @__PURE__ */ (function() {
      function EncodeUTF82(cb) {
        this.ondata = cb;
      }
      EncodeUTF82.prototype.push = function(chunk, final) {
        if (!this.ondata)
          err(5);
        if (this.d)
          err(4);
        this.ondata(strToU8(chunk), this.d = final || false);
      };
      return EncodeUTF82;
    })();
    exports2.EncodeUTF8 = EncodeUTF8;
    function strToU8(str, latin1) {
      if (latin1) {
        var ar_1 = new u8(str.length);
        for (var i2 = 0; i2 < str.length; ++i2)
          ar_1[i2] = str.charCodeAt(i2);
        return ar_1;
      }
      if (te)
        return te.encode(str);
      var l = str.length;
      var ar = new u8(str.length + (str.length >> 1));
      var ai = 0;
      var w = function(v) {
        ar[ai++] = v;
      };
      for (var i2 = 0; i2 < l; ++i2) {
        if (ai + 5 > ar.length) {
          var n = new u8(ai + 8 + (l - i2 << 1));
          n.set(ar);
          ar = n;
        }
        var c = str.charCodeAt(i2);
        if (c < 128 || latin1)
          w(c);
        else if (c < 2048)
          w(192 | c >> 6), w(128 | c & 63);
        else if (c > 55295 && c < 57344)
          c = 65536 + (c & 1023 << 10) | str.charCodeAt(++i2) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
        else
          w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
      }
      return slc(ar, 0, ai);
    }
    function strFromU8(dat, latin1) {
      if (latin1) {
        var r = "";
        for (var i2 = 0; i2 < dat.length; i2 += 16384)
          r += String.fromCharCode.apply(null, dat.subarray(i2, i2 + 16384));
        return r;
      } else if (td) {
        return td.decode(dat);
      } else {
        var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
        if (r.length)
          err(8);
        return s;
      }
    }
    var dbf = function(l) {
      return l == 1 ? 3 : l < 6 ? 2 : l == 9 ? 1 : 0;
    };
    var slzh = function(d, b) {
      return b + 30 + b2(d, b + 26) + b2(d, b + 28);
    };
    var zh = function(d, b, z) {
      var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
      var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
      return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
    };
    var z64hs = function(d, b, l, z, sc, su, off) {
      var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
      var nf = nsc + nsu + noff;
      if (z && nf) {
        for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
          if (b2(d, b) == 1) {
            return [
              nsc ? b8(d, b + 4 + 8 * nsu) : sc,
              nsu ? b8(d, b + 4) : su,
              noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
              1
            ];
          }
        }
        if (z < 2)
          err(13);
      }
      return [sc, su, off, 0];
    };
    var exfl = function(ex) {
      var le = 0;
      if (ex) {
        for (var k in ex) {
          var l = ex[k].length;
          if (l > 65535)
            err(9);
          le += l + 4;
        }
      }
      return le;
    };
    var wzh = function(d, b, f, fn, u, c, ce, co) {
      var fl2 = fn.length, ex = f.extra, col = co && co.length;
      var exl = exfl(ex);
      wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
      if (ce != null)
        d[b++] = 20, d[b++] = f.os;
      d[b] = 20, b += 2;
      d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
      d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
      var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
      if (y < 0 || y > 119)
        err(10);
      wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
      if (c != -1) {
        wbytes(d, b, f.crc);
        wbytes(d, b + 4, c < 0 ? -c - 2 : c);
        wbytes(d, b + 8, f.size);
      }
      wbytes(d, b + 12, fl2);
      wbytes(d, b + 14, exl), b += 16;
      if (ce != null) {
        wbytes(d, b, col);
        wbytes(d, b + 6, f.attrs);
        wbytes(d, b + 10, ce), b += 14;
      }
      d.set(fn, b);
      b += fl2;
      if (exl) {
        for (var k in ex) {
          var exf = ex[k], l = exf.length;
          wbytes(d, b, +k);
          wbytes(d, b + 2, l);
          d.set(exf, b + 4), b += 4 + l;
        }
      }
      if (col)
        d.set(co, b), b += col;
      return b;
    };
    var wzf = function(o, b, c, d, e) {
      wbytes(o, b, 101010256);
      wbytes(o, b + 8, c);
      wbytes(o, b + 10, c);
      wbytes(o, b + 12, d);
      wbytes(o, b + 16, e);
    };
    var ZipPassThrough = /* @__PURE__ */ (function() {
      function ZipPassThrough2(filename) {
        this.filename = filename;
        this.c = crc();
        this.size = 0;
        this.compression = 0;
      }
      ZipPassThrough2.prototype.process = function(chunk, final) {
        this.ondata(null, chunk, final);
      };
      ZipPassThrough2.prototype.push = function(chunk, final) {
        if (!this.ondata)
          err(5);
        this.c.p(chunk);
        this.size += chunk.length;
        if (final)
          this.crc = this.c.d();
        this.process(chunk, final || false);
      };
      return ZipPassThrough2;
    })();
    exports2.ZipPassThrough = ZipPassThrough;
    var ZipDeflate = /* @__PURE__ */ (function() {
      function ZipDeflate2(filename, opts) {
        var _this = this;
        if (!opts)
          opts = {};
        ZipPassThrough.call(this, filename);
        this.d = new Deflate(opts, function(dat, final) {
          _this.ondata(null, dat, final);
        });
        this.compression = 8;
        this.flag = dbf(opts.level);
      }
      ZipDeflate2.prototype.process = function(chunk, final) {
        try {
          this.d.push(chunk, final);
        } catch (e) {
          this.ondata(e, null, final);
        }
      };
      ZipDeflate2.prototype.push = function(chunk, final) {
        ZipPassThrough.prototype.push.call(this, chunk, final);
      };
      return ZipDeflate2;
    })();
    exports2.ZipDeflate = ZipDeflate;
    var AsyncZipDeflate = /* @__PURE__ */ (function() {
      function AsyncZipDeflate2(filename, opts) {
        var _this = this;
        if (!opts)
          opts = {};
        ZipPassThrough.call(this, filename);
        this.d = new AsyncDeflate(opts, function(err2, dat, final) {
          _this.ondata(err2, dat, final);
        });
        this.compression = 8;
        this.flag = dbf(opts.level);
        this.terminate = this.d.terminate;
      }
      AsyncZipDeflate2.prototype.process = function(chunk, final) {
        this.d.push(chunk, final);
      };
      AsyncZipDeflate2.prototype.push = function(chunk, final) {
        ZipPassThrough.prototype.push.call(this, chunk, final);
      };
      return AsyncZipDeflate2;
    })();
    exports2.AsyncZipDeflate = AsyncZipDeflate;
    var Zip = /* @__PURE__ */ (function() {
      function Zip2(cb) {
        this.ondata = cb;
        this.u = [];
        this.d = 1;
      }
      Zip2.prototype.add = function(file) {
        var _this = this;
        if (!this.ondata)
          err(5);
        if (this.d & 2)
          this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, false);
        else {
          var f = strToU8(file.filename), fl_1 = f.length;
          var com = file.comment, o = com && strToU8(com);
          var u = fl_1 != file.filename.length || o && com.length != o.length;
          var hl_1 = fl_1 + exfl(file.extra) + 30;
          if (fl_1 > 65535)
            this.ondata(err(11, 0, 1), null, false);
          var header = new u8(hl_1);
          wzh(header, 0, file, f, u, -1);
          var chks_1 = [header];
          var pAll_1 = function() {
            for (var _i = 0, chks_2 = chks_1; _i < chks_2.length; _i++) {
              var chk = chks_2[_i];
              _this.ondata(null, chk, false);
            }
            chks_1 = [];
          };
          var tr_1 = this.d;
          this.d = 0;
          var ind_1 = this.u.length;
          var uf_1 = mrg(file, {
            f,
            u,
            o,
            t: function() {
              if (file.terminate)
                file.terminate();
            },
            r: function() {
              pAll_1();
              if (tr_1) {
                var nxt = _this.u[ind_1 + 1];
                if (nxt)
                  nxt.r();
                else
                  _this.d = 1;
              }
              tr_1 = 1;
            }
          });
          var cl_1 = 0;
          file.ondata = function(err2, dat, final) {
            if (err2) {
              _this.ondata(err2, dat, final);
              _this.terminate();
            } else {
              cl_1 += dat.length;
              chks_1.push(dat);
              if (final) {
                var dd = new u8(16);
                wbytes(dd, 0, 134695760);
                wbytes(dd, 4, file.crc);
                wbytes(dd, 8, cl_1);
                wbytes(dd, 12, file.size);
                chks_1.push(dd);
                uf_1.c = cl_1, uf_1.b = hl_1 + cl_1 + 16, uf_1.crc = file.crc, uf_1.size = file.size;
                if (tr_1)
                  uf_1.r();
                tr_1 = 1;
              } else if (tr_1)
                pAll_1();
            }
          };
          this.u.push(uf_1);
        }
      };
      Zip2.prototype.end = function() {
        var _this = this;
        if (this.d & 2) {
          this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, true);
          return;
        }
        if (this.d)
          this.e();
        else
          this.u.push({
            r: function() {
              if (!(_this.d & 1))
                return;
              _this.u.splice(-1, 1);
              _this.e();
            },
            t: function() {
            }
          });
        this.d = 3;
      };
      Zip2.prototype.e = function() {
        var bt = 0, l = 0, tl = 0;
        for (var _i = 0, _a2 = this.u; _i < _a2.length; _i++) {
          var f = _a2[_i];
          tl += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0);
        }
        var out = new u8(tl + 22);
        for (var _b2 = 0, _c = this.u; _b2 < _c.length; _b2++) {
          var f = _c[_b2];
          wzh(out, bt, f, f.f, f.u, -f.c - 2, l, f.o);
          bt += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0), l += f.b;
        }
        wzf(out, bt, this.u.length, tl, l);
        this.ondata(null, out, true);
        this.d = 2;
      };
      Zip2.prototype.terminate = function() {
        for (var _i = 0, _a2 = this.u; _i < _a2.length; _i++) {
          var f = _a2[_i];
          f.t();
        }
        this.d = 2;
      };
      return Zip2;
    })();
    exports2.Zip = Zip;
    function zip(data, opts, cb) {
      if (!cb)
        cb = opts, opts = {};
      if (typeof cb != "function")
        err(7);
      var r = {};
      fltn(data, "", r, opts);
      var k = Object.keys(r);
      var lft = k.length, o = 0, tot = 0;
      var slft = lft, files = new Array(lft);
      var term = [];
      var tAll = function() {
        for (var i3 = 0; i3 < term.length; ++i3)
          term[i3]();
      };
      var cbd = function(a, b) {
        mt(function() {
          cb(a, b);
        });
      };
      mt(function() {
        cbd = cb;
      });
      var cbf = function() {
        var out = new u8(tot + 22), oe = o, cdl = tot - o;
        tot = 0;
        for (var i3 = 0; i3 < slft; ++i3) {
          var f = files[i3];
          try {
            var l = f.c.length;
            wzh(out, tot, f, f.f, f.u, l);
            var badd = 30 + f.f.length + exfl(f.extra);
            var loc = tot + badd;
            out.set(f.c, loc);
            wzh(out, o, f, f.f, f.u, l, tot, f.m), o += 16 + badd + (f.m ? f.m.length : 0), tot = loc + l;
          } catch (e) {
            return cbd(e, null);
          }
        }
        wzf(out, o, files.length, cdl, oe);
        cbd(null, out);
      };
      if (!lft)
        cbf();
      var _loop_1 = function(i3) {
        var fn = k[i3];
        var _a2 = r[fn], file = _a2[0], p = _a2[1];
        var c = crc(), size = file.length;
        c.p(file);
        var f = strToU8(fn), s = f.length;
        var com = p.comment, m = com && strToU8(com), ms = m && m.length;
        var exl = exfl(p.extra);
        var compression = p.level == 0 ? 0 : 8;
        var cbl = function(e, d) {
          if (e) {
            tAll();
            cbd(e, null);
          } else {
            var l = d.length;
            files[i3] = mrg(p, {
              size,
              crc: c.d(),
              c: d,
              f,
              m,
              u: s != fn.length || m && com.length != ms,
              compression
            });
            o += 30 + s + exl + l;
            tot += 76 + 2 * (s + exl) + (ms || 0) + l;
            if (!--lft)
              cbf();
          }
        };
        if (s > 65535)
          cbl(err(11, 0, 1), null);
        if (!compression)
          cbl(null, file);
        else if (size < 16e4) {
          try {
            cbl(null, deflateSync(file, p));
          } catch (e) {
            cbl(e, null);
          }
        } else
          term.push(deflate(file, p, cbl));
      };
      for (var i2 = 0; i2 < slft; ++i2) {
        _loop_1(i2);
      }
      return tAll;
    }
    function zipSync(data, opts) {
      if (!opts)
        opts = {};
      var r = {};
      var files = [];
      fltn(data, "", r, opts);
      var o = 0;
      var tot = 0;
      for (var fn in r) {
        var _a2 = r[fn], file = _a2[0], p = _a2[1];
        var compression = p.level == 0 ? 0 : 8;
        var f = strToU8(fn), s = f.length;
        var com = p.comment, m = com && strToU8(com), ms = m && m.length;
        var exl = exfl(p.extra);
        if (s > 65535)
          err(11);
        var d = compression ? deflateSync(file, p) : file, l = d.length;
        var c = crc();
        c.p(file);
        files.push(mrg(p, {
          size: file.length,
          crc: c.d(),
          c: d,
          f,
          m,
          u: s != fn.length || m && com.length != ms,
          o,
          compression
        }));
        o += 30 + s + exl + l;
        tot += 76 + 2 * (s + exl) + (ms || 0) + l;
      }
      var out = new u8(tot + 22), oe = o, cdl = tot - o;
      for (var i2 = 0; i2 < files.length; ++i2) {
        var f = files[i2];
        wzh(out, f.o, f, f.f, f.u, f.c.length);
        var badd = 30 + f.f.length + exfl(f.extra);
        out.set(f.c, f.o + badd);
        wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
      }
      wzf(out, o, files.length, cdl, oe);
      return out;
    }
    var UnzipPassThrough = /* @__PURE__ */ (function() {
      function UnzipPassThrough2() {
      }
      UnzipPassThrough2.prototype.push = function(chunk, final) {
        this.ondata(null, chunk, final);
      };
      UnzipPassThrough2.compression = 0;
      return UnzipPassThrough2;
    })();
    exports2.UnzipPassThrough = UnzipPassThrough;
    var UnzipInflate = /* @__PURE__ */ (function() {
      function UnzipInflate2() {
        var _this = this;
        this.i = new Inflate(function(dat, final) {
          _this.ondata(null, dat, final);
        });
      }
      UnzipInflate2.prototype.push = function(chunk, final) {
        try {
          this.i.push(chunk, final);
        } catch (e) {
          this.ondata(e, null, final);
        }
      };
      UnzipInflate2.compression = 8;
      return UnzipInflate2;
    })();
    exports2.UnzipInflate = UnzipInflate;
    var AsyncUnzipInflate = /* @__PURE__ */ (function() {
      function AsyncUnzipInflate2(_, sz) {
        var _this = this;
        if (sz < 32e4) {
          this.i = new Inflate(function(dat, final) {
            _this.ondata(null, dat, final);
          });
        } else {
          this.i = new AsyncInflate(function(err2, dat, final) {
            _this.ondata(err2, dat, final);
          });
          this.terminate = this.i.terminate;
        }
      }
      AsyncUnzipInflate2.prototype.push = function(chunk, final) {
        if (this.i.terminate)
          chunk = slc(chunk, 0);
        this.i.push(chunk, final);
      };
      AsyncUnzipInflate2.compression = 8;
      return AsyncUnzipInflate2;
    })();
    exports2.AsyncUnzipInflate = AsyncUnzipInflate;
    var Unzip = /* @__PURE__ */ (function() {
      function Unzip2(cb) {
        this.onfile = cb;
        this.k = [];
        this.o = {
          0: UnzipPassThrough
        };
        this.p = et;
      }
      Unzip2.prototype.push = function(chunk, final) {
        var _this = this;
        if (!this.onfile)
          err(5);
        if (!this.p)
          err(4);
        if (this.c > 0) {
          var len = Math.min(this.c, chunk.length);
          var toAdd = chunk.subarray(0, len);
          this.c -= len;
          if (this.d)
            this.d.push(toAdd, !this.c);
          else
            this.k[0].push(toAdd);
          chunk = chunk.subarray(len);
          if (chunk.length)
            return this.push(chunk, final);
        } else {
          var f = 0, i2 = 0, is = void 0, buf = void 0;
          if (!this.p.length)
            buf = chunk;
          else if (!chunk.length)
            buf = this.p;
          else {
            buf = new u8(this.p.length + chunk.length);
            buf.set(this.p), buf.set(chunk, this.p.length);
          }
          var l = buf.length, oc = this.c, add = oc && this.d;
          var _loop_2 = function() {
            var sig = b4(buf, i2);
            if (sig == 67324752) {
              f = 1, is = i2;
              this_1.d = null;
              this_1.c = 0;
              var bf = b2(buf, i2 + 6), cmp_1 = b2(buf, i2 + 8), u = bf & 2048, dd = bf & 8, fnl = b2(buf, i2 + 26), es = b2(buf, i2 + 28);
              if (l > i2 + 30 + fnl + es) {
                var chks_3 = [];
                this_1.k.unshift(chks_3);
                f = 2;
                var lsc = b4(buf, i2 + 18), lsu = b4(buf, i2 + 22);
                var fn_1 = strFromU8(buf.subarray(i2 + 30, i2 += 30 + fnl), !u);
                var _a2 = z64hs(buf, i2, es, 2, lsc, lsu, 0), sc_1 = _a2[0], su_1 = _a2[1], z64 = _a2[3];
                if (dd)
                  sc_1 = -1 - z64;
                i2 += es;
                this_1.c = sc_1;
                var d_1;
                var file_1 = {
                  name: fn_1,
                  compression: cmp_1,
                  start: function() {
                    if (!file_1.ondata)
                      err(5);
                    if (!sc_1)
                      file_1.ondata(null, et, true);
                    else {
                      var ctr = _this.o[cmp_1];
                      if (!ctr)
                        file_1.ondata(err(14, "unknown compression type " + cmp_1, 1), null, false);
                      d_1 = sc_1 < 0 ? new ctr(fn_1) : new ctr(fn_1, sc_1, su_1);
                      d_1.ondata = function(err2, dat3, final2) {
                        file_1.ondata(err2, dat3, final2);
                      };
                      for (var _i = 0, chks_4 = chks_3; _i < chks_4.length; _i++) {
                        var dat2 = chks_4[_i];
                        d_1.push(dat2, false);
                      }
                      if (_this.k[0] == chks_3 && _this.c)
                        _this.d = d_1;
                      else
                        d_1.push(et, true);
                    }
                  },
                  terminate: function() {
                    if (d_1 && d_1.terminate)
                      d_1.terminate();
                  }
                };
                if (sc_1 >= 0)
                  file_1.size = sc_1, file_1.originalSize = su_1;
                this_1.onfile(file_1);
              }
              return "break";
            } else if (oc) {
              if (sig == 134695760) {
                is = i2 += 12 + (oc == -2 && 8), f = 3, this_1.c = 0;
                return "break";
              } else if (sig == 33639248) {
                is = i2 -= 4, f = 3, this_1.c = 0;
                return "break";
              }
            }
          };
          var this_1 = this;
          for (; i2 < l - 4; ++i2) {
            var state_1 = _loop_2();
            if (state_1 === "break")
              break;
          }
          this.p = et;
          if (oc < 0) {
            var dat = f ? buf.subarray(0, is - 12 - (oc == -2 && 8) - (b4(buf, is - 16) == 134695760 && 4)) : buf.subarray(0, i2);
            if (add)
              add.push(dat, !!f);
            else
              this.k[+(f == 2)].push(dat);
          }
          if (f & 2)
            return this.push(buf.subarray(i2), final);
          this.p = buf.subarray(i2);
        }
        if (final) {
          if (this.c)
            err(13);
          this.p = null;
        }
      };
      Unzip2.prototype.register = function(decoder) {
        this.o[decoder.compression] = decoder;
      };
      return Unzip2;
    })();
    exports2.Unzip = Unzip;
    var mt = typeof queueMicrotask == "function" ? queueMicrotask : typeof setTimeout == "function" ? setTimeout : function(fn) {
      fn();
    };
    function unzip(data, opts, cb) {
      if (!cb)
        cb = opts, opts = {};
      if (typeof cb != "function")
        err(7);
      var term = [];
      var tAll = function() {
        for (var i3 = 0; i3 < term.length; ++i3)
          term[i3]();
      };
      var files = {};
      var cbd = function(a, b) {
        mt(function() {
          cb(a, b);
        });
      };
      mt(function() {
        cbd = cb;
      });
      var e = data.length - 22;
      for (; b4(data, e) != 101010256; --e) {
        if (!e || data.length - e > 65558) {
          cbd(err(13, 0, 1), null);
          return tAll;
        }
      }
      ;
      var lft = b2(data, e + 8);
      if (lft) {
        var c = lft;
        var o = b4(data, e + 16);
        var z = b4(data, e - 20) == 117853008;
        if (z) {
          var ze = b4(data, e - 12);
          z = b4(data, ze) == 101075792;
          if (z) {
            c = lft = b4(data, ze + 32);
            o = b4(data, ze + 48);
          }
        }
        var fltr = opts && opts.filter;
        var _loop_3 = function(i3) {
          var _a2 = zh(data, o, z), c_1 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
          o = no;
          var cbl = function(e2, d) {
            if (e2) {
              tAll();
              cbd(e2, null);
            } else {
              if (d)
                files[fn] = d;
              if (!--lft)
                cbd(null, files);
            }
          };
          if (!fltr || fltr({
            name: fn,
            size: sc,
            originalSize: su,
            compression: c_1
          })) {
            if (!c_1)
              cbl(null, slc(data, b, b + sc));
            else if (c_1 == 8) {
              var infl = data.subarray(b, b + sc);
              if (su < 524288 || sc > 0.8 * su) {
                try {
                  cbl(null, inflateSync(infl, { out: new u8(su) }));
                } catch (e2) {
                  cbl(e2, null);
                }
              } else
                term.push(inflate(infl, { size: su }, cbl));
            } else
              cbl(err(14, "unknown compression type " + c_1, 1), null);
          } else
            cbl(null, null);
        };
        for (var i2 = 0; i2 < c; ++i2) {
          _loop_3(i2);
        }
      } else
        cbd(null, {});
      return tAll;
    }
    function unzipSync(data, opts) {
      var files = {};
      var e = data.length - 22;
      for (; b4(data, e) != 101010256; --e) {
        if (!e || data.length - e > 65558)
          err(13);
      }
      ;
      var c = b2(data, e + 8);
      if (!c)
        return {};
      var o = b4(data, e + 16);
      var z = b4(data, e - 20) == 117853008;
      if (z) {
        var ze = b4(data, e - 12);
        z = b4(data, ze) == 101075792;
        if (z) {
          c = b4(data, ze + 32);
          o = b4(data, ze + 48);
        }
      }
      var fltr = opts && opts.filter;
      for (var i2 = 0; i2 < c; ++i2) {
        var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
        o = no;
        if (!fltr || fltr({
          name: fn,
          size: sc,
          originalSize: su,
          compression: c_2
        })) {
          if (!c_2)
            files[fn] = slc(data, b, b + sc);
          else if (c_2 == 8)
            files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
          else
            err(14, "unknown compression type " + c_2);
        }
      }
      return files;
    }
  }
});

// node_modules/read-excel-file/commonjs/utility/convertValuesFromUint8ArraysToStrings.js
var require_convertValuesFromUint8ArraysToStrings = __commonJS({
  "node_modules/read-excel-file/commonjs/utility/convertValuesFromUint8ArraysToStrings.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = convertValuesFromUint8ArraysToStrings;
    exports2.strFromU8 = strFromU8;
    var _fflate = require_node3();
    var _checkpoint = _interopRequireDefault(require_checkpoint());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function convertValuesFromUint8ArraysToStrings(entries) {
      (0, _checkpoint["default"])("convert files to strings");
      var convertedEntries = {};
      for (var _i = 0, _Object$keys = Object.keys(entries); _i < _Object$keys.length; _i++) {
        var key = _Object$keys[_i];
        convertedEntries[key] = strFromU8(entries[key]);
      }
      return convertedEntries;
    }
    function strFromU8(data) {
      if (typeof TextDecoder !== "undefined") {
        return new TextDecoder().decode(data);
      } else {
        return (0, _fflate.strFromU8)(data);
      }
    }
  }
});

// node_modules/read-excel-file/commonjs/utility/isPromise.js
var require_isPromise = __commonJS({
  "node_modules/read-excel-file/commonjs/utility/isPromise.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = isPromise;
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    function isPromise(anything) {
      return _typeof(anything) === "object" && typeof anything.then === "function";
    }
  }
});

// node_modules/read-excel-file/commonjs/xlsx/SheetNotFoundError.js
var require_SheetNotFoundError = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/SheetNotFoundError.js"(exports2) {
    "use strict";
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = void 0;
    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
      }
    }
    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      Object.defineProperty(Constructor, "prototype", { writable: false });
      return Constructor;
    }
    function _toPropertyKey(arg) {
      var key = _toPrimitive(arg, "string");
      return _typeof(key) === "symbol" ? key : String(key);
    }
    function _toPrimitive(input, hint) {
      if (_typeof(input) !== "object" || input === null) return input;
      var prim = input[Symbol.toPrimitive];
      if (prim !== void 0) {
        var res = prim.call(input, hint || "default");
        if (_typeof(res) !== "object") return res;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return (hint === "string" ? String : Number)(input);
    }
    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }
    function _inherits(subClass, superClass) {
      if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function");
      }
      subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } });
      Object.defineProperty(subClass, "prototype", { writable: false });
      if (superClass) _setPrototypeOf(subClass, superClass);
    }
    function _createSuper(Derived) {
      var hasNativeReflectConstruct = _isNativeReflectConstruct();
      return function _createSuperInternal() {
        var Super = _getPrototypeOf(Derived), result;
        if (hasNativeReflectConstruct) {
          var NewTarget = _getPrototypeOf(this).constructor;
          result = Reflect.construct(Super, arguments, NewTarget);
        } else {
          result = Super.apply(this, arguments);
        }
        return _possibleConstructorReturn(this, result);
      };
    }
    function _possibleConstructorReturn(self, call) {
      if (call && (_typeof(call) === "object" || typeof call === "function")) {
        return call;
      } else if (call !== void 0) {
        throw new TypeError("Derived constructors may only return object or undefined");
      }
      return _assertThisInitialized(self);
    }
    function _assertThisInitialized(self) {
      if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      }
      return self;
    }
    function _wrapNativeSuper(Class) {
      var _cache = typeof Map === "function" ? /* @__PURE__ */ new Map() : void 0;
      _wrapNativeSuper = function _wrapNativeSuper2(Class2) {
        if (Class2 === null || !_isNativeFunction(Class2)) return Class2;
        if (typeof Class2 !== "function") {
          throw new TypeError("Super expression must either be null or a function");
        }
        if (typeof _cache !== "undefined") {
          if (_cache.has(Class2)) return _cache.get(Class2);
          _cache.set(Class2, Wrapper);
        }
        function Wrapper() {
          return _construct(Class2, arguments, _getPrototypeOf(this).constructor);
        }
        Wrapper.prototype = Object.create(Class2.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } });
        return _setPrototypeOf(Wrapper, Class2);
      };
      return _wrapNativeSuper(Class);
    }
    function _construct(Parent, args, Class) {
      if (_isNativeReflectConstruct()) {
        _construct = Reflect.construct.bind();
      } else {
        _construct = function _construct2(Parent2, args2, Class2) {
          var a = [null];
          a.push.apply(a, args2);
          var Constructor = Function.bind.apply(Parent2, a);
          var instance = new Constructor();
          if (Class2) _setPrototypeOf(instance, Class2.prototype);
          return instance;
        };
      }
      return _construct.apply(null, arguments);
    }
    function _isNativeReflectConstruct() {
      if (typeof Reflect === "undefined" || !Reflect.construct) return false;
      if (Reflect.construct.sham) return false;
      if (typeof Proxy === "function") return true;
      try {
        Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
        }));
        return true;
      } catch (e) {
        return false;
      }
    }
    function _isNativeFunction(fn) {
      return Function.toString.call(fn).indexOf("[native code]") !== -1;
    }
    function _setPrototypeOf(o, p) {
      _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
        o2.__proto__ = p2;
        return o2;
      };
      return _setPrototypeOf(o, p);
    }
    function _getPrototypeOf(o) {
      _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf2(o2) {
        return o2.__proto__ || Object.getPrototypeOf(o2);
      };
      return _getPrototypeOf(o);
    }
    var SheetNotFoundError = exports2["default"] = /* @__PURE__ */ (function(_Error) {
      _inherits(SheetNotFoundError2, _Error);
      var _super = _createSuper(SheetNotFoundError2);
      function SheetNotFoundError2(sheet, sheets) {
        var _this;
        _classCallCheck(this, SheetNotFoundError2);
        _this = _super.call(this, "Sheet not found: ".concat(typeof sheet === "number" ? sheet + ". Sheet count: " + sheets.length : sheet + ". Available sheets: " + sheets.join(", ")));
        _this.name = "SheetNotFoundError";
        _this.sheet = sheet;
        _this.sheets = sheets;
        return _this;
      }
      return _createClass(SheetNotFoundError2);
    })(/* @__PURE__ */ _wrapNativeSuper(Error));
  }
});

// node_modules/read-excel-file/commonjs/xlsx/parseSpreadsheetContents.js
var require_parseSpreadsheetContents = __commonJS({
  "node_modules/read-excel-file/commonjs/xlsx/parseSpreadsheetContents.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = parseSpreadsheetContentsInWorker;
    var _parseSpreadsheetInfo = _interopRequireDefault(require_parseSpreadsheetInfo());
    var _parseFilePaths = _interopRequireDefault(require_parseFilePaths());
    var _parseStyles = _interopRequireDefault(require_parseStyles());
    var _parseSharedStrings = _interopRequireDefault(require_parseSharedStrings());
    var _parseSheet = _interopRequireDefault(require_parseSheet());
    var _convertValuesFromUint8ArraysToStrings = _interopRequireDefault(require_convertValuesFromUint8ArraysToStrings());
    var _checkpoint = _interopRequireDefault(require_checkpoint());
    var _isPromise = _interopRequireDefault(require_isPromise());
    var _InvalidSpreadsheetError = _interopRequireDefault(require_InvalidSpreadsheetError());
    var _SheetNotFoundError = _interopRequireDefault(require_SheetNotFoundError());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    function _createForOfIteratorHelperLoose(o, allowArrayLike) {
      var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
      if (it) return (it = it.call(o)).next.bind(it);
      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;
        var i = 0;
        return function() {
          if (i >= o.length) return { done: true };
          return { done: false, value: o[i++] };
        };
      }
      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }
    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;
      for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
      return arr2;
    }
    function ownKeys(e, r) {
      var t = Object.keys(e);
      if (Object.getOwnPropertySymbols) {
        var o = Object.getOwnPropertySymbols(e);
        r && (o = o.filter(function(r2) {
          return Object.getOwnPropertyDescriptor(e, r2).enumerable;
        })), t.push.apply(t, o);
      }
      return t;
    }
    function _objectSpread(e) {
      for (var r = 1; r < arguments.length; r++) {
        var t = null != arguments[r] ? arguments[r] : {};
        r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
          _defineProperty(e, r2, t[r2]);
        }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
          Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
        });
      }
      return e;
    }
    function _defineProperty(obj, key, value) {
      key = _toPropertyKey(key);
      if (key in obj) {
        Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
      } else {
        obj[key] = value;
      }
      return obj;
    }
    function _toPropertyKey(arg) {
      var key = _toPrimitive(arg, "string");
      return _typeof(key) === "symbol" ? key : String(key);
    }
    function _toPrimitive(input, hint) {
      if (_typeof(input) !== "object" || input === null) return input;
      var prim = input[Symbol.toPrimitive];
      if (prim !== void 0) {
        var res = prim.call(input, hint || "default");
        if (_typeof(res) !== "object") return res;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return (hint === "string" ? String : Number)(input);
    }
    function parseSpreadsheetContents(parseXml, contents_) {
      var options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
      var contents = (0, _convertValuesFromUint8ArraysToStrings["default"])(contents_);
      (0, _checkpoint["default"])("parse spreadsheet info and file paths");
      return readFiles(getXmlFilesAtFixedPaths(), contents, parseXml).then(function(_ref) {
        var spreadsheetInfo = _ref.spreadsheetInfo, filePaths = _ref.filePaths;
        (0, _checkpoint["default"])('parse "shared strings" and "styles"');
        return readFiles(getXmlFilesAtNonFixedPaths(filePaths), contents, parseXml).then(function(_ref2) {
          var sharedStrings = _ref2.sharedStrings, styles = _ref2.styles;
          var sheetRelationIdsToRead = options.sheets ? options.sheets.map(function(sheet) {
            return getSheetRelationId(sheet, spreadsheetInfo.sheets);
          }) : spreadsheetInfo.sheets.map(function(_) {
            return _.relationId;
          });
          (0, _checkpoint["default"])("parse sheet".concat(sheetRelationIdsToRead.length === 1 ? "" : "s", " data"));
          var dateFormatDetectionCache = [];
          return readFiles(getSheetDataXmlFiles(filePaths, sheetRelationIdsToRead, {
            sharedStrings,
            styles,
            epoch1904: spreadsheetInfo.epoch1904,
            dateFormatDetectionCache,
            options
          }), contents, parseXml).then(function(sheetsData) {
            (0, _checkpoint["default"])("end");
            return sheetRelationIdsToRead.map(function(sheetRelationId) {
              return {
                sheet: getSheetNameByRelationId(sheetRelationId, spreadsheetInfo.sheets),
                data: sheetsData[sheetRelationId]
              };
            });
          });
        });
      });
    }
    function parseSpreadsheetContentsInWorker(createWorkerFunction, parseXml, contents, options) {
      if (!(options && options.parseNumber)) {
        options = _objectSpread(_objectSpread({}, options), {}, {
          parseNumber: null
        });
      }
      return parseSpreadsheetContents(parseXml, contents, options);
    }
    function getSheetRelationId(sheet, sheets) {
      if (typeof sheet === "string") {
        for (var _iterator = _createForOfIteratorHelperLoose(sheets), _step; !(_step = _iterator()).done; ) {
          var _sheet = _step.value;
          if (_sheet.name === sheet) {
            return _sheet.relationId;
          }
        }
      } else {
        if (sheet <= sheets.length) {
          return sheets[sheet - 1].relationId;
        }
      }
      throw new _SheetNotFoundError["default"](sheet, sheets.map(function(_) {
        return _.name;
      }));
    }
    function getSheetNameByRelationId(sheetRelationId, sheets) {
      for (var _iterator2 = _createForOfIteratorHelperLoose(sheets), _step2; !(_step2 = _iterator2()).done; ) {
        var sheet = _step2.value;
        if (sheet.relationId === sheetRelationId) {
          return sheet.name;
        }
      }
      throw new Error("Sheet relation ID not found: ".concat(sheetRelationId));
    }
    function getXmlFilesAtFixedPaths() {
      return {
        // Read the paths to certain files inside the `.xlsx` file, which is itself just a `.zip` archive.
        // These paths aren't standardized between different spreadsheet editors.
        // https://github.com/tidyverse/readxl/issues/104
        "xl/_rels/workbook.xml.rels": {
          name: "filePaths",
          parse: _parseFilePaths["default"]
        },
        // General info on the spreadsheet.
        "xl/workbook.xml": {
          name: "spreadsheetInfo",
          parse: _parseSpreadsheetInfo["default"]
        }
      };
    }
    function getXmlFilesAtNonFixedPaths(filePaths) {
      var _ref3;
      return _ref3 = {}, _defineProperty(_ref3, filePaths.sharedStrings || "xl/sharedStrings.xml", {
        name: "sharedStrings",
        // `parseSharedStrings()` returns a `Promise`.
        parse: _parseSharedStrings["default"],
        // It seems that "sharedStrings.xml" is not required to exist.
        // For example, that could be the case when a spreadsheet doesn't contain any strings.
        // https://github.com/catamphetamine/read-excel-file/issues/85
        fallback: Promise.resolve([])
      }), _defineProperty(_ref3, filePaths.styles || "xl/styles.xml", {
        name: "styles",
        parse: _parseStyles["default"],
        fallback: {}
      }), _ref3;
    }
    function getSheetDataXmlFiles(filePaths, sheetRelationIdsToRead, sheetDataParserParameters) {
      return Object.keys(filePaths.sheets).filter(function(sheetRelationId) {
        return sheetRelationIdsToRead.includes(sheetRelationId);
      }).reduce(function(filesInfo, sheetRelationId) {
        return _objectSpread(_objectSpread({}, filesInfo), {}, _defineProperty({}, filePaths.sheets[sheetRelationId], {
          name: sheetRelationId,
          // `parseSheet()` returns a `Promise`.
          parse: function parse(content, parseXml) {
            return (0, _parseSheet["default"])(content, parseXml, sheetDataParserParameters);
          }
        }));
      }, {});
    }
    function readFiles(filesInfo, contents, parseXml) {
      var results = {};
      var _loop = function _loop3() {
        var filePath = _Object$keys[_i];
        var fileInfo = filesInfo[filePath];
        results[fileInfo.name] = contents[filePath] === void 0 ? fileInfo.fallback === void 0 ? (function() {
          throw new _InvalidSpreadsheetError["default"]('"'.concat(filePath, '" file not found inside the `.xlsx` file'));
        })() : fileInfo.fallback : fileInfo.parse(contents[filePath], parseXml);
      };
      for (var _i = 0, _Object$keys = Object.keys(filesInfo); _i < _Object$keys.length; _i++) {
        _loop();
      }
      var promises = [];
      var _loop2 = function _loop22() {
        var name = _Object$keys2[_i2];
        if ((0, _isPromise["default"])(results[name])) {
          promises.push(results[name].then(function(result) {
            results[name] = result;
          }));
        }
      };
      for (var _i2 = 0, _Object$keys2 = Object.keys(results); _i2 < _Object$keys2.length; _i2++) {
        _loop2();
      }
      if (promises.length > 0) {
        return Promise.all(promises).then(function() {
          return results;
        });
      }
      return results;
    }
  }
});

// node_modules/read-excel-file/commonjs/export/readXlsxFileNode.js
var require_readXlsxFileNode = __commonJS({
  "node_modules/read-excel-file/commonjs/export/readXlsxFileNode.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = readXlsxFile2;
    var _node = _interopRequireDefault(require_node2());
    var _parseXml = _interopRequireDefault(require_parseXml());
    var _unpackXlsxFileNode = _interopRequireDefault(require_unpackXlsxFileNode());
    var _parseSpreadsheetContents = _interopRequireDefault(require_parseSpreadsheetContents());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function readXlsxFile2(input, options) {
      return (0, _unpackXlsxFileNode["default"])(input).then(function(contents) {
        return (0, _parseSpreadsheetContents["default"])(_node["default"], _parseXml["default"], contents, options);
      });
    }
  }
});

// node_modules/read-excel-file/commonjs/parseSheetData/InvalidError.js
var require_InvalidError = __commonJS({
  "node_modules/read-excel-file/commonjs/parseSheetData/InvalidError.js"(exports2) {
    "use strict";
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = void 0;
    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
      }
    }
    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      Object.defineProperty(Constructor, "prototype", { writable: false });
      return Constructor;
    }
    function _toPropertyKey(arg) {
      var key = _toPrimitive(arg, "string");
      return _typeof(key) === "symbol" ? key : String(key);
    }
    function _toPrimitive(input, hint) {
      if (_typeof(input) !== "object" || input === null) return input;
      var prim = input[Symbol.toPrimitive];
      if (prim !== void 0) {
        var res = prim.call(input, hint || "default");
        if (_typeof(res) !== "object") return res;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return (hint === "string" ? String : Number)(input);
    }
    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }
    function _inherits(subClass, superClass) {
      if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function");
      }
      subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } });
      Object.defineProperty(subClass, "prototype", { writable: false });
      if (superClass) _setPrototypeOf(subClass, superClass);
    }
    function _createSuper(Derived) {
      var hasNativeReflectConstruct = _isNativeReflectConstruct();
      return function _createSuperInternal() {
        var Super = _getPrototypeOf(Derived), result;
        if (hasNativeReflectConstruct) {
          var NewTarget = _getPrototypeOf(this).constructor;
          result = Reflect.construct(Super, arguments, NewTarget);
        } else {
          result = Super.apply(this, arguments);
        }
        return _possibleConstructorReturn(this, result);
      };
    }
    function _possibleConstructorReturn(self, call) {
      if (call && (_typeof(call) === "object" || typeof call === "function")) {
        return call;
      } else if (call !== void 0) {
        throw new TypeError("Derived constructors may only return object or undefined");
      }
      return _assertThisInitialized(self);
    }
    function _assertThisInitialized(self) {
      if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      }
      return self;
    }
    function _wrapNativeSuper(Class) {
      var _cache = typeof Map === "function" ? /* @__PURE__ */ new Map() : void 0;
      _wrapNativeSuper = function _wrapNativeSuper2(Class2) {
        if (Class2 === null || !_isNativeFunction(Class2)) return Class2;
        if (typeof Class2 !== "function") {
          throw new TypeError("Super expression must either be null or a function");
        }
        if (typeof _cache !== "undefined") {
          if (_cache.has(Class2)) return _cache.get(Class2);
          _cache.set(Class2, Wrapper);
        }
        function Wrapper() {
          return _construct(Class2, arguments, _getPrototypeOf(this).constructor);
        }
        Wrapper.prototype = Object.create(Class2.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } });
        return _setPrototypeOf(Wrapper, Class2);
      };
      return _wrapNativeSuper(Class);
    }
    function _construct(Parent, args, Class) {
      if (_isNativeReflectConstruct()) {
        _construct = Reflect.construct.bind();
      } else {
        _construct = function _construct2(Parent2, args2, Class2) {
          var a = [null];
          a.push.apply(a, args2);
          var Constructor = Function.bind.apply(Parent2, a);
          var instance = new Constructor();
          if (Class2) _setPrototypeOf(instance, Class2.prototype);
          return instance;
        };
      }
      return _construct.apply(null, arguments);
    }
    function _isNativeReflectConstruct() {
      if (typeof Reflect === "undefined" || !Reflect.construct) return false;
      if (Reflect.construct.sham) return false;
      if (typeof Proxy === "function") return true;
      try {
        Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
        }));
        return true;
      } catch (e) {
        return false;
      }
    }
    function _isNativeFunction(fn) {
      return Function.toString.call(fn).indexOf("[native code]") !== -1;
    }
    function _setPrototypeOf(o, p) {
      _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf2(o2, p2) {
        o2.__proto__ = p2;
        return o2;
      };
      return _setPrototypeOf(o, p);
    }
    function _getPrototypeOf(o) {
      _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf2(o2) {
        return o2.__proto__ || Object.getPrototypeOf(o2);
      };
      return _getPrototypeOf(o);
    }
    var InvalidError = exports2["default"] = /* @__PURE__ */ (function(_Error) {
      _inherits(InvalidError2, _Error);
      var _super = _createSuper(InvalidError2);
      function InvalidError2(reason) {
        var _this;
        _classCallCheck(this, InvalidError2);
        _this = _super.call(this, "invalid");
        _this.reason = reason;
        return _this;
      }
      return _createClass(InvalidError2);
    })(/* @__PURE__ */ _wrapNativeSuper(Error));
  }
});

// node_modules/read-excel-file/commonjs/parseSheetData/types/Number.js
var require_Number = __commonJS({
  "node_modules/read-excel-file/commonjs/parseSheetData/types/Number.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = NumberType;
    var _InvalidError = _interopRequireDefault(require_InvalidError());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function NumberType(value) {
      if (typeof value === "string") {
        var stringifiedValue = value;
        value = Number(value);
        if (String(value) !== stringifiedValue) {
          throw new _InvalidError["default"]("not_a_number");
        }
      }
      if (typeof value !== "number") {
        throw new _InvalidError["default"]("not_a_number");
      }
      if (isNaN(value)) {
        throw new _InvalidError["default"]("invalid_number");
      }
      if (!isFinite(value)) {
        throw new _InvalidError["default"]("out_of_bounds");
      }
      return value;
    }
  }
});

// node_modules/read-excel-file/commonjs/parseSheetData/types/String.js
var require_String = __commonJS({
  "node_modules/read-excel-file/commonjs/parseSheetData/types/String.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = StringType;
    var _InvalidError = _interopRequireDefault(require_InvalidError());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function StringType(value) {
      if (typeof value === "string") {
        return value;
      }
      if (typeof value === "number") {
        if (isNaN(value)) {
          throw new _InvalidError["default"]("invalid_number");
        }
        if (!isFinite(value)) {
          throw new _InvalidError["default"]("out_of_bounds");
        }
        return String(value);
      }
      throw new _InvalidError["default"]("not_a_string");
    }
  }
});

// node_modules/read-excel-file/commonjs/parseSheetData/types/Boolean.js
var require_Boolean = __commonJS({
  "node_modules/read-excel-file/commonjs/parseSheetData/types/Boolean.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = BooleanType;
    var _InvalidError = _interopRequireDefault(require_InvalidError());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function BooleanType(value) {
      if (typeof value === "boolean") {
        return value;
      }
      throw new _InvalidError["default"]("not_a_boolean");
    }
  }
});

// node_modules/read-excel-file/commonjs/parseSheetData/types/Date.js
var require_Date = __commonJS({
  "node_modules/read-excel-file/commonjs/parseSheetData/types/Date.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = DateType;
    var _InvalidError = _interopRequireDefault(require_InvalidError());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function DateType(value) {
      if (value instanceof Date) {
        if (isNaN(value.valueOf())) {
          throw new _InvalidError["default"]("out_of_bounds");
        }
        return value;
      }
      throw new _InvalidError["default"]("not_a_date");
    }
  }
});

// node_modules/read-excel-file/commonjs/utility/isObject.js
var require_isObject = __commonJS({
  "node_modules/read-excel-file/commonjs/utility/isObject.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = isObject;
    var objectConstructor = {}.constructor;
    function isObject(object) {
      return object !== void 0 && object !== null && object.constructor === objectConstructor;
    }
  }
});

// node_modules/read-excel-file/commonjs/parseSheetData/parseSheetData.js
var require_parseSheetData = __commonJS({
  "node_modules/read-excel-file/commonjs/parseSheetData/parseSheetData.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = parseSheetData;
    exports2.getNextSubstring = getNextSubstring;
    exports2.parseSeparatedSubstrings = parseSeparatedSubstrings;
    exports2.parseSheetDataWithPerRowErrors = parseSheetDataWithPerRowErrors;
    exports2.parseValue = parseValue;
    var _Number = _interopRequireDefault(require_Number());
    var _String = _interopRequireDefault(require_String());
    var _Boolean = _interopRequireDefault(require_Boolean());
    var _Date = _interopRequireDefault(require_Date());
    var _isObject = _interopRequireDefault(require_isObject());
    var _checkpoint = _interopRequireDefault(require_checkpoint());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    function _slicedToArray(arr, i) {
      return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
    }
    function _iterableToArrayLimit(r, l) {
      var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
      if (null != t) {
        var e, n, i, u, a = [], f = true, o = false;
        try {
          if (i = (t = t.call(r)).next, 0 === l) {
            if (Object(t) !== t) return;
            f = false;
          } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
        } catch (r2) {
          o = true, n = r2;
        } finally {
          try {
            if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return;
          } finally {
            if (o) throw n;
          }
        }
        return a;
      }
    }
    function _toArray(arr) {
      return _arrayWithHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableRest();
    }
    function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function _iterableToArray(iter) {
      if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
    }
    function _arrayWithHoles(arr) {
      if (Array.isArray(arr)) return arr;
    }
    function ownKeys(e, r) {
      var t = Object.keys(e);
      if (Object.getOwnPropertySymbols) {
        var o = Object.getOwnPropertySymbols(e);
        r && (o = o.filter(function(r2) {
          return Object.getOwnPropertyDescriptor(e, r2).enumerable;
        })), t.push.apply(t, o);
      }
      return t;
    }
    function _objectSpread(e) {
      for (var r = 1; r < arguments.length; r++) {
        var t = null != arguments[r] ? arguments[r] : {};
        r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
          _defineProperty(e, r2, t[r2]);
        }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
          Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
        });
      }
      return e;
    }
    function _defineProperty(obj, key, value) {
      key = _toPropertyKey(key);
      if (key in obj) {
        Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
      } else {
        obj[key] = value;
      }
      return obj;
    }
    function _toPropertyKey(arg) {
      var key = _toPrimitive(arg, "string");
      return _typeof(key) === "symbol" ? key : String(key);
    }
    function _toPrimitive(input, hint) {
      if (_typeof(input) !== "object" || input === null) return input;
      var prim = input[Symbol.toPrimitive];
      if (prim !== void 0) {
        var res = prim.call(input, hint || "default");
        if (_typeof(res) !== "object") return res;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return (hint === "string" ? String : Number)(input);
    }
    function _createForOfIteratorHelperLoose(o, allowArrayLike) {
      var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
      if (it) return (it = it.call(o)).next.bind(it);
      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;
        var i = 0;
        return function() {
          if (i >= o.length) return { done: true };
          return { done: false, value: o[i++] };
        };
      }
      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }
    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;
      for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
      return arr2;
    }
    var EMPTY_CELL_VALUE = null;
    function parseSheetData(data, schema, optionsCustom) {
      (0, _checkpoint["default"])("parse sheet data using schema");
      var objects = [];
      var errors = [];
      var parsedRows = parseSheetDataWithPerRowErrors(data, schema, optionsCustom);
      var parsedRowIndex = 0;
      for (var _iterator = _createForOfIteratorHelperLoose(parsedRows), _step; !(_step = _iterator()).done; ) {
        var _step$value = _step.value, object = _step$value.object, rowErrors = _step$value.errors;
        if (rowErrors) {
          errors = errors.concat(rowErrors.map(
            // Add row number property to each row error.
            function(rowError) {
              return _objectSpread(_objectSpread({}, rowError), {}, {
                row: parsedRowIndex + 1
              });
            }
          ));
        } else {
          objects.push(object);
        }
        parsedRowIndex++;
      }
      (0, _checkpoint["default"])("end");
      if (errors.length > 0) {
        return {
          errors,
          columns: data[0]
        };
      }
      return {
        objects,
        columns: data[0] || []
      };
    }
    function parseSheetDataWithPerRowErrors(data, schema, optionsCustom) {
      validateSchema(schema);
      var options = applyDefaultOptions(optionsCustom);
      var _data = _toArray(data), columns = _data[0], dataRows = _data.slice(1);
      return dataRows.map(function(row) {
        return parseDataRow(row, schema, columns, options);
      });
    }
    function parseDataRow(dataRow, schema, columns, options) {
      var schemaEntry = {
        schema
      };
      var _parseProperty = parseProperty(dataRow, schemaEntry, void 0, columns, options), value = _parseProperty.value, isEmptyValue2 = _parseProperty.isEmptyValue, errors = _parseProperty.errors, children = _parseProperty.children;
      var dummyParentObject = {
        // The "dummy" parent object has a "dummy" value.
        // This value is irrelevant because it won't be read anywhere.
        value: PARSED_OBJECT_TREE_START,
        // The "dummy" parent object is empty if the parsed row is empty.
        isEmptyValue: isEmptyValue2,
        // The "dummy" object has the same errors as the parsed row.
        errors,
        // The parsed object by default is not required to have any data
        // so the "dummy" object is not required.
        isRequired: void 0
      };
      var requiredErrors = runPendingRequiredValidations(
        schemaEntry,
        value,
        isEmptyValue2,
        errors,
        children,
        // Simulate a "dummy" parent object for the top-level object.
        dummyParentObject.isRequired,
        dummyParentObject.value,
        dummyParentObject.isEmptyValue,
        dummyParentObject.errors,
        columns
      );
      if (errors || requiredErrors) {
        return {
          errors: (errors || []).concat(requiredErrors || [])
        };
      }
      return {
        object: transformValue(value, isEmptyValue2, false, void 0, options)
      };
    }
    function parseObject(row, schema, path, columns, options) {
      var object = {};
      var isEmptyObject = true;
      var errors = [];
      var children = [];
      for (var _i = 0, _Object$keys = Object.keys(schema); _i < _Object$keys.length; _i++) {
        var key = _Object$keys[_i];
        var child = parseProperty(row, schema[key], getPropertyPath(key, path), columns, options);
        if (child.errors) {
          errors = errors.concat(child.errors);
        } else {
          object[key] = transformValue(child.value, child.isEmptyValue, Array.isArray(schema[key].type), getPropertyPath(key, path), options);
          if (isEmptyObject && !child.isEmptyValue) {
            isEmptyObject = false;
          }
        }
        children.push(_objectSpread(_objectSpread({}, child), {}, {
          // `schemaEntry` will be used when running `required` validation of this property (later),
          schemaEntry: schema[key]
        }));
      }
      if (errors.length > 0) {
        return {
          // Return the errors.
          errors,
          // Return the `children` because `required` validations still have to be run (later).
          children
        };
      }
      return {
        value: object,
        isEmptyValue: isEmptyObject,
        // Return the `children` because `required` validations still have to be run (later).
        children
      };
    }
    function parseProperty(row, schemaEntry, path, columns, options) {
      var columnIndex = schemaEntry.column ? columns.indexOf(schemaEntry.column) : void 0;
      var isMissingColumn = schemaEntry.column ? columnIndex < 0 : void 0;
      var _ref = schemaEntry.column ? isMissingColumn ? {
        value: options.propertyValueWhenColumnIsMissing,
        isEmptyValue: true
      } : parseCellValueWithPossibleErrors(row[columnIndex], schemaEntry, columnIndex, options) : parseObject(row, schemaEntry.schema, path, columns, options), value = _ref.value, isEmptyValue2 = _ref.isEmptyValue, errors = _ref.errors, children = _ref.children;
      if (errors) {
        return {
          // Return the errors.
          errors,
          // Return the `children` because `required` validations still have to be run (later).
          children
        };
      }
      return {
        value,
        isEmptyValue: isEmptyValue2,
        // Return the `children` because `required` validations still have to be run (later).
        children
      };
    }
    function parseCellValueWithPossibleErrors(cellValue, schemaEntry, columnIndex, options) {
      var _parseCellValue = parseCellValue(cellValue, schemaEntry, options), value = _parseCellValue.value, isEmptyValue2 = _parseCellValue.isEmptyValue, errorMessage = _parseCellValue.error, errorReason = _parseCellValue.reason;
      if (errorMessage) {
        var error = createError({
          error: errorMessage,
          reason: errorReason,
          column: schemaEntry.column,
          columnIndex,
          valueType: schemaEntry.type,
          value: cellValue
        });
        return {
          errors: [error]
        };
      }
      return {
        value,
        isEmptyValue: isEmptyValue2
      };
    }
    function parseCellValue(cellValue, schemaEntry, options) {
      if (cellValue === void 0) {
        return {
          value: options.propertyValueWhenColumnIsMissing,
          isEmptyValue: true
        };
      }
      if (cellValue === EMPTY_CELL_VALUE) {
        return {
          value: options.propertyValueWhenCellIsEmpty,
          isEmptyValue: true
        };
      }
      if (Array.isArray(schemaEntry.type)) {
        return parseArrayValue(cellValue, schemaEntry, options);
      }
      return parseValue(cellValue, schemaEntry, options);
    }
    function parseArrayValue(value, schemaEntry, options) {
      if (typeof value !== "string") {
        return {
          error: "not_a_string"
        };
      }
      var isEmptyArray = true;
      var errors = [];
      var reasons = [];
      var values = parseSeparatedSubstrings(value, options.separatorCharacter).map(function(substring) {
        if (errors.length > 0) {
          return;
        }
        if (!substring) {
          errors.push("invalid");
          reasons.push("syntax");
          return;
        }
        var _parseValue = parseValue(substring, schemaEntry, options), value2 = _parseValue.value, isEmptyValue2 = _parseValue.isEmptyValue, error = _parseValue.error, reason = _parseValue.reason;
        if (error) {
          errors.push(error);
          reasons.push(reason);
          return;
        }
        if (isEmptyArray && !isEmptyValue2) {
          isEmptyArray = false;
        }
        return value2;
      });
      if (errors.length > 0) {
        return {
          error: errors[0],
          reason: reasons[0]
        };
      }
      return {
        value: values,
        isEmptyValue: isEmptyArray
      };
    }
    function parseValue(value, schemaEntry, options) {
      if (value === EMPTY_CELL_VALUE) {
        return {
          value,
          isEmptyValue: true
        };
      }
      var result;
      if (schemaEntry.type) {
        result = parseValueOfType(
          value,
          // Get the type of the value.
          //
          // Handle the case if it's a comma-separated value.
          // Example `type`: String[]
          // Example Input Value: 'Barack Obama, "String, with, colons", Donald Trump'
          // Example Parsed Value: ['Barack Obama', 'String, with, colons', 'Donald Trump']
          //
          Array.isArray(schemaEntry.type) ? schemaEntry.type[0] : schemaEntry.type,
          options
        );
      } else {
        result = {
          value
        };
      }
      if (result.error) {
        return result;
      }
      if (value === EMPTY_CELL_VALUE) {
        return {
          value,
          isEmptyValue: true
        };
      }
      if (schemaEntry.oneOf) {
        var errorAndReason = validateOneOf(result.value, schemaEntry.oneOf);
        if (errorAndReason) {
          return errorAndReason;
        }
      }
      if (schemaEntry.validate) {
        try {
          schemaEntry.validate(result.value);
        } catch (error) {
          return {
            error: error.message
          };
        }
      }
      return {
        value: result.value,
        isEmptyValue: isEmptyValue(result.value)
      };
    }
    function validateOneOf(value, oneOf) {
      if (oneOf.indexOf(value) < 0) {
        return {
          error: "invalid",
          reason: "unknown"
        };
      }
    }
    function parseValueOfType(value, type) {
      switch (type) {
        case String:
          return parseValueUsingTypeParser(value, _String["default"]);
        case Number:
          return parseValueUsingTypeParser(value, _Number["default"]);
        case Date:
          return parseValueUsingTypeParser(value, _Date["default"]);
        case Boolean:
          return parseValueUsingTypeParser(value, _Boolean["default"]);
        default:
          if (typeof type !== "function") {
            throw new Error("Unsupported schema `type`: ".concat(type && type.name || type));
          }
          return parseValueUsingTypeParser(value, type);
      }
    }
    function parseValueUsingTypeParser(value, type) {
      try {
        var parsedValue = type(value);
        if (parsedValue === void 0) {
          return {
            value: EMPTY_CELL_VALUE
          };
        }
        return {
          value: parsedValue
        };
      } catch (error) {
        var result = {
          error: error.message
        };
        if (error.reason) {
          result.reason = error.reason;
        }
        return result;
      }
    }
    function getNextSubstring(string, separatorCharacter, startIndex) {
      var i = 0;
      var substring = "";
      while (startIndex + i < string.length) {
        var character = string[startIndex + i];
        if (character === separatorCharacter) {
          return [substring, i];
        } else {
          substring += character;
          i++;
        }
      }
      return [substring, i];
    }
    function parseSeparatedSubstrings(string, separatorCharacter) {
      var elements = [];
      var index = 0;
      while (index < string.length) {
        var _getNextSubstring = getNextSubstring(string, separatorCharacter, index), _getNextSubstring2 = _slicedToArray(_getNextSubstring, 2), substring = _getNextSubstring2[0], length = _getNextSubstring2[1];
        index += length + separatorCharacter.length;
        elements.push(substring.trim());
      }
      return elements;
    }
    function transformValue(value, isEmptyValue2, isArrayType, path, options) {
      if (isEmptyValue2) {
        if ((0, _isObject["default"])(value)) {
          return options.transformEmptyObject(value, {
            path
          });
        } else if (isArrayType) {
          return options.transformEmptyArray(value, {
            path
          });
        }
      }
      return value;
    }
    function getPropertyPath(propertyName, parentObjectPath) {
      return "".concat(parentObjectPath ? parentObjectPath + "." : "").concat(propertyName);
    }
    function runPendingRequiredValidations(schemaEntry, value, isEmptyValue2, errors, children, parentObjectIsRequired, parentObjectValue, parentObjectValueIsEmpty, parentObjectErrors, columns) {
      var requiredErrors = [];
      var isRequired = isPropertyRequired(schemaEntry, parentObjectIsRequired, parentObjectValue, parentObjectValueIsEmpty, parentObjectErrors);
      if (isRequired && isEmptyValue2) {
        requiredErrors.push(createError({
          error: "required",
          column: schemaEntry.column,
          columnIndex: columns.indexOf(schemaEntry.column),
          valueType: schemaEntry.type,
          value
        }));
      }
      if (children) {
        for (var _iterator2 = _createForOfIteratorHelperLoose(children), _step2; !(_step2 = _iterator2()).done; ) {
          var child = _step2.value;
          var requiredErrorsOfChild = runPendingRequiredValidations(
            child.schemaEntry,
            child.value,
            child.isEmptyValue,
            child.errors,
            child.children,
            // The following properties describe the parent object of the `child`,
            // i.e. the current (iterated) object.
            isRequired,
            value,
            isEmptyValue2,
            errors,
            columns
          );
          if (requiredErrorsOfChild) {
            requiredErrors = requiredErrors.concat(requiredErrorsOfChild);
          }
        }
      }
      if (requiredErrors.length > 0) {
        return requiredErrors;
      }
    }
    function isPropertyRequired(schemaEntry, parentObjectIsRequired, parentObjectValue, parentObjectValueIsEmpty, parentObjectErrors) {
      if (parentObjectIsRequired === false && (parentObjectValueIsEmpty || parentObjectErrors)) {
        return false;
      }
      return schemaEntry.required && (typeof schemaEntry.required === "boolean" ? schemaEntry.required : (
        // If there were any non-`required` errors when parsing the parent object,
        // the `parentObject` will be `undefined`. In that case, "complex" `required()`
        // validations — the ones where `required` is a function — can't really be run
        // because those validations assume a fully and correctly parsed parent object
        // be passed as an argument, and the thing is that the `parentObject` is unknown.
        // As a result, only "basic" `required` validations could be run,
        // i.e. the ones where `required` is just a boolean, and "complex" `required`
        // validations, i.e. the ones where `required` is a functions, should be skipped,
        // because it's better to skip some `required` errors than to trigger falsy ones.
        parentObjectErrors ? false : schemaEntry.required(parentObjectValue)
      ));
    }
    function createError(_ref2) {
      var column = _ref2.column, columnIndex = _ref2.columnIndex, valueType = _ref2.valueType, value = _ref2.value, errorMessage = _ref2.error, reason = _ref2.reason;
      var error = {
        error: errorMessage,
        column,
        columnIndex,
        value
      };
      if (reason) {
        error.reason = reason;
      }
      if (valueType) {
        error.type = valueType;
      }
      return error;
    }
    function validateSchema(schema) {
      for (var _i2 = 0, _Object$keys2 = Object.keys(schema); _i2 < _Object$keys2.length; _i2++) {
        var key = _Object$keys2[_i2];
        var schemaEntry = schema[key];
        if (_typeof(schemaEntry.type) === "object" && !Array.isArray(schemaEntry.type)) {
          throw new Error("When defining a nested schema, use a `schema` property instead of a `type` property");
        }
        if (!schemaEntry.schema) {
          if (!schemaEntry.column) {
            throw new Error('"column" not defined for schema entry "'.concat(key, '".'));
          }
        }
      }
      validateObjectSchemaRequiredProperty(schema, void 0);
    }
    function validateObjectSchemaRequiredProperty(schema, required) {
      if (required !== void 0 && required !== false) {
        throw new Error("In a schema, a nested object can have a `required` property but the only allowed value is `undefined` or `false`. Otherwise, a \"required\" error for a nested object would have to include a specific `column` title and a nested object doesn't have one. You've specified the following `required`: ".concat(required));
      }
      for (var _i3 = 0, _Object$keys3 = Object.keys(schema); _i3 < _Object$keys3.length; _i3++) {
        var key = _Object$keys3[_i3];
        if ((0, _isObject["default"])(schema[key].schema)) {
          if (schema[key].column) {
            throw new Error("In a schema, `column` property is only allowed when describing a property value rather than a nested object. Key: ".concat(key, ". Schema:\n").concat(JSON.stringify(schema[key], null, 2)));
          }
          validateObjectSchemaRequiredProperty(schema[key].schema, schema[key].required);
        }
      }
    }
    function isEmptyValue(value) {
      return value === void 0 || value === null;
    }
    var DEFAULT_OPTIONS = {
      propertyValueWhenColumnIsMissing: void 0,
      propertyValueWhenCellIsEmpty: null,
      // shouldSkipRequiredValidationWhenColumnIsMissing: () => false,
      // `transformEmptyObject(object, { path })` applies to both the top-level object
      // and any of its nested objects.
      transformEmptyObject: function transformEmptyObject() {
        return null;
      },
      transformEmptyArray: function transformEmptyArray() {
        return null;
      },
      separatorCharacter: ","
    };
    function applyDefaultOptions(options) {
      if (options) {
        return _objectSpread(_objectSpread({}, DEFAULT_OPTIONS), options);
      } else {
        return DEFAULT_OPTIONS;
      }
    }
    var PARSED_OBJECT_TREE_START = {};
  }
});

// node_modules/read-excel-file/commonjs/export/parseSheet.js
var require_parseSheet2 = __commonJS({
  "node_modules/read-excel-file/commonjs/export/parseSheet.js"(exports2) {
    "use strict";
    function _typeof(o) {
      "@babel/helpers - typeof";
      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
        return typeof o2;
      } : function(o2) {
        return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
      }, _typeof(o);
    }
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = parseSheet;
    var _parseSpreadsheetContents = _interopRequireDefault(require_parseSpreadsheetContents());
    var _parseSheetData = _interopRequireDefault(require_parseSheetData());
    var _excluded = ["schema"];
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function ownKeys(e, r) {
      var t = Object.keys(e);
      if (Object.getOwnPropertySymbols) {
        var o = Object.getOwnPropertySymbols(e);
        r && (o = o.filter(function(r2) {
          return Object.getOwnPropertyDescriptor(e, r2).enumerable;
        })), t.push.apply(t, o);
      }
      return t;
    }
    function _objectSpread(e) {
      for (var r = 1; r < arguments.length; r++) {
        var t = null != arguments[r] ? arguments[r] : {};
        r % 2 ? ownKeys(Object(t), true).forEach(function(r2) {
          _defineProperty(e, r2, t[r2]);
        }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r2) {
          Object.defineProperty(e, r2, Object.getOwnPropertyDescriptor(t, r2));
        });
      }
      return e;
    }
    function _defineProperty(obj, key, value) {
      key = _toPropertyKey(key);
      if (key in obj) {
        Object.defineProperty(obj, key, { value, enumerable: true, configurable: true, writable: true });
      } else {
        obj[key] = value;
      }
      return obj;
    }
    function _toPropertyKey(arg) {
      var key = _toPrimitive(arg, "string");
      return _typeof(key) === "symbol" ? key : String(key);
    }
    function _toPrimitive(input, hint) {
      if (_typeof(input) !== "object" || input === null) return input;
      var prim = input[Symbol.toPrimitive];
      if (prim !== void 0) {
        var res = prim.call(input, hint || "default");
        if (_typeof(res) !== "object") return res;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return (hint === "string" ? String : Number)(input);
    }
    function _objectWithoutProperties(source, excluded) {
      if (source == null) return {};
      var target = _objectWithoutPropertiesLoose(source, excluded);
      var key, i;
      if (Object.getOwnPropertySymbols) {
        var sourceSymbolKeys = Object.getOwnPropertySymbols(source);
        for (i = 0; i < sourceSymbolKeys.length; i++) {
          key = sourceSymbolKeys[i];
          if (excluded.indexOf(key) >= 0) continue;
          if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
          target[key] = source[key];
        }
      }
      return target;
    }
    function _objectWithoutPropertiesLoose(source, excluded) {
      if (source == null) return {};
      var target = {};
      var sourceKeys = Object.keys(source);
      var key, i;
      for (i = 0; i < sourceKeys.length; i++) {
        key = sourceKeys[i];
        if (excluded.indexOf(key) >= 0) continue;
        target[key] = source[key];
      }
      return target;
    }
    function parseSheet(createWorkerFunction, parseXml, contents, sheet, optionsWithSchema) {
      var _ref = optionsWithSchema || {}, schema = _ref.schema, options = _objectWithoutProperties(_ref, _excluded);
      return (0, _parseSpreadsheetContents["default"])(createWorkerFunction, parseXml, contents, _objectSpread(_objectSpread({}, options), {}, {
        sheets: [sheet === void 0 ? 1 : sheet]
      })).then(function(sheets) {
        var sheetData = sheets[0].data;
        if (schema) {
          return (0, _parseSheetData["default"])(sheetData, schema, options);
        }
        return sheetData;
      });
    }
  }
});

// node_modules/read-excel-file/commonjs/export/readSheetNode.js
var require_readSheetNode = __commonJS({
  "node_modules/read-excel-file/commonjs/export/readSheetNode.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = readSheet;
    var _node = _interopRequireDefault(require_node2());
    var _parseXml = _interopRequireDefault(require_parseXml());
    var _unpackXlsxFileNode = _interopRequireDefault(require_unpackXlsxFileNode());
    var _parseSheet = _interopRequireDefault(require_parseSheet2());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function readSheet(input, sheet, options) {
      if (!options && sheet && typeof sheet !== "number" && typeof sheet !== "string") {
        options = sheet;
        sheet = void 0;
      }
      return (0, _unpackXlsxFileNode["default"])(input).then(function(contents) {
        return (0, _parseSheet["default"])(_node["default"], _parseXml["default"], contents, sheet, options);
      });
    }
  }
});

// node_modules/read-excel-file/commonjs/parseSheetData/types/additional/Integer.js
var require_Integer = __commonJS({
  "node_modules/read-excel-file/commonjs/parseSheetData/types/additional/Integer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = Integer;
    exports2.isInteger = isInteger;
    var _InvalidError = _interopRequireDefault(require_InvalidError());
    var _Number = _interopRequireDefault(require_Number());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function Integer(value) {
      value = (0, _Number["default"])(value);
      if (!isInteger(value)) {
        throw new _InvalidError["default"]("not_an_integer");
      }
      return value;
    }
    function isInteger(x) {
      return (x | 0) === x;
    }
  }
});

// node_modules/read-excel-file/commonjs/parseSheetData/types/additional/Email.js
var require_Email = __commonJS({
  "node_modules/read-excel-file/commonjs/parseSheetData/types/additional/Email.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = Email;
    exports2.isEmail = isEmail;
    var _InvalidError = _interopRequireDefault(require_InvalidError());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function Email(value) {
      if (typeof value === "string") {
        if (isEmail(value)) {
          return value;
        }
        throw new _InvalidError["default"]("not_an_email");
      }
      throw new _InvalidError["default"]("not_a_string");
    }
    var EMAIL_REGEXP = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    function isEmail(value) {
      return EMAIL_REGEXP.test(value);
    }
  }
});

// node_modules/read-excel-file/commonjs/parseSheetData/types/additional/URL.js
var require_URL = __commonJS({
  "node_modules/read-excel-file/commonjs/parseSheetData/types/additional/URL.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = URL;
    exports2.isURL = isURL;
    var _InvalidError = _interopRequireDefault(require_InvalidError());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function URL(value) {
      if (typeof value === "string") {
        if (isURL(value)) {
          return value;
        }
        throw new _InvalidError["default"]("not_a_url");
      }
      throw new _InvalidError["default"]("not_a_string");
    }
    var URL_REGEXP = /^(?:(?:(?:https?|ftp):)?\/\/)(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u00a1-\uffff][a-z0-9\u00a1-\uffff_-]{0,62})?[a-z0-9\u00a1-\uffff]\.)*(?:[a-z\u00a1-\uffff]{2,}))(?::\d{2,5})?(?:[/?#]\S*)?$/i;
    function isURL(value) {
      return URL_REGEXP.test(value);
    }
  }
});

// node_modules/read-excel-file/commonjs/parseSheetData/normalizeSchemaEntry.js
var require_normalizeSchemaEntry = __commonJS({
  "node_modules/read-excel-file/commonjs/parseSheetData/normalizeSchemaEntry.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = normalizeSchemaEntry;
    var _isObject = _interopRequireDefault(require_isObject());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function normalizeSchemaEntry(schemaEntry) {
      return schemaEntry;
    }
  }
});

// node_modules/read-excel-file/commonjs/parseSheetData/getColumnTitleForProperty.js
var require_getColumnTitleForProperty = __commonJS({
  "node_modules/read-excel-file/commonjs/parseSheetData/getColumnTitleForProperty.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", {
      value: true
    });
    exports2["default"] = getColumnTitleForProperty;
    var _normalizeSchemaEntry = _interopRequireDefault(require_normalizeSchemaEntry());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { "default": obj };
    }
    function getColumnTitleForProperty(path, schema) {
      var isObject = true;
      var schemaEntry = {
        schema
      };
      var i = 0;
      while (i < path.length) {
        if (isObject) {
          var schemaEntryOfChildProperty = schemaEntry.schema[path[i]];
          if (schemaEntryOfChildProperty) {
            schemaEntry = (0, _normalizeSchemaEntry["default"])(schemaEntryOfChildProperty);
            isObject = "schema" in schemaEntry;
          } else {
            return;
          }
        } else {
          return;
        }
        i++;
      }
      if (!isObject) {
        return schemaEntry.column;
      }
    }
  }
});

// node_modules/read-excel-file/node/index.cjs
var require_node4 = __commonJS({
  "node_modules/read-excel-file/node/index.cjs"(exports2, module2) {
    exports2 = module2.exports = require_readXlsxFileNode().default;
    exports2["default"] = require_readXlsxFileNode().default;
    exports2.readSheet = require_readSheetNode().default;
    exports2.InvalidInputError = require_InvalidInputError().default;
    exports2.InvalidSpreadsheetError = require_InvalidSpreadsheetError().default;
    exports2.SheetNotFoundError = require_SheetNotFoundError().default;
    exports2.parseSheetData = require_parseSheetData().default;
    exports2.Integer = require_Integer().default;
    exports2.Email = require_Email().default;
    exports2.URL = require_URL().default;
    exports2.getColumnTitleForProperty = require_getColumnTitleForProperty().default;
  }
});

// vendor/read-xlsx-entry.cjs
var readXlsxFile = require_node4();
module.exports = readXlsxFile.default || readXlsxFile;
/*! Bundled license information:

unzipper-esm/dist/ensureDir.js:
unzipper-esm/dist/extract.js:
unzipper-esm/dist/mapPromises.js:
unzipper-esm/dist/Open/directory.js:
unzipper-esm/dist/Open/index.js:
  (*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE *)
*/

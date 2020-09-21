/** @license: UNLICENSED
FOR DEMONSTRATIONAL PURPOSES ONLY*/

// debounce: hold off consecutive events if they happened
// with a time interval smaller than threshold milliseconds.
// allowLeading allows the leading event to pass through.
//
// Example:
//   const transformed = debounce(200)(listener);
export const debounce = (threshold=200, allowLeading=false) => (fn) => {
    const Idle = 0;
    const Cooldown = 1;
    const Pending = 2;

    let toHandle;
    let state = Idle;
    let pendingValue;

    const relax = () => {
        if (state === Pending) {
            state = Cooldown;
            toHandle = setTimeout(relax, threshold);
            const value = pendingValue;
            pendingValue = 0;
            fn(value);
        } else if (state === Cooldown) {
            state = Idle;
            toHandle = 0;
        }
    };

    return (value) => {
        if (state === Idle && allowLeading) {
            state = Cooldown;
            toHandle = setTimeout(relax, threshold);
            fn(value);
        } else {
            pendingValue = value;
            state = Pending;
            clearTimeout(toHandle);
            toHandle = setTimeout(relax, threshold);
        }
    };
};

// switchPromise is similar to Rx.js switchMap.
// Transforms a stream of promises into a stream of most recent values.
//
// Example:
//   const transformed = switchPromise((url) => fetch(url))(listener);
export const switchPromise = (resolver) => (fn) => {
    let index = 0;
    let receivedIndex = -1;
    return (value) => {
        const promiseIndex = index;
        const handleResult = (value) => {
            if (receivedIndex >= promiseIndex) {
                return;
            }
            receivedIndex = promiseIndex;
            fn(value);
        };
        index += 1;
        resolver(value).then((result) => handleResult({result}))
             .catch((error) => handleResult({error}));
    };
};

const shallowEq = (a, b) => a === b;
const identity = x => x;
// Removes repeating values from the stream.
// By default, uses strict shallow equality.
// key allows specifying a mapper for uniqueness criteria.
//
// Example:
//   const transformed = distinctUntilChanged()(listener);
export const distinctUntilChanged = (eq=shallowEq, key=identity) => (fn) => {
    let hasPrevious = false;
    let previous;
    return (value) => {
        const keyValue = key(value);
        if (hasPrevious && eq(previous, keyValue)) {
            return;
        }
        hasPrevious = true;
        previous = keyValue;
        fn(value);
    };
};

// Transform a stream of values using a mapper function
//
// Example:
// const transformed = map(x => x)(listener);
export const map = (mapper) => (fn) => (value) => fn(mapper(value));

// Apply multiple stream transformations and attach it to a stream listener.
// stream listener is the last argument.
//
// Example:
//   const transformed = pipe(
//     map(x => x),
//     debounce(100),
//     listener);
export const pipe = (...args) => {
    let index = args.length - 1;
    let fn = args[index];
    index -= 1;

    while (index >= 0) {
        fn = args[index](fn);
        index -= 1
    }

    return fn;
};
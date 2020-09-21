// LICENSE: UNLICENSED
// FOR DEMONSTRATIONAL PURPOSES ONLY
export const debounce = (threshold=200, fireFirst=false) => (fn) => {
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
        if (state === Idle && fireFirst) {
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
        resolver(value)
            .then((result) => handleResult({result}))
            .catch((error) => handleResult({error}));
    };
};

const shallowEq = (a, b) => a === b;
const identity = x => x;
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

export const map = (mapper) => (fn) => (value) => fn(mapper(value));

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
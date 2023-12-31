/**
 * This module contains basic methods for interacting with OCaml
 */
export { MlArray, MlTuple, MlOption, MlBool };
const MlArray = {
    to(arr) {
        return [0, ...arr];
    },
    from([, ...arr]) {
        return arr;
    },
    map([, ...arr], map) {
        return [0, ...arr.map(map)];
    },
};
const MlTuple = Object.assign(function MlTuple(x, y) {
    return [0, x, y];
}, {
    from([, x, y]) {
        return [x, y];
    },
    first(t) {
        return t[1];
    },
    second(t) {
        return t[2];
    },
});
const MlBool = Object.assign(function MlBool(b) {
    return b ? 1 : 0;
}, {
    from(b) {
        return !!b;
    },
});
const MlOption = Object.assign(function MlOption(x) {
    return x === undefined ? 0 : [0, x];
}, {
    from(option) {
        return option === 0 ? undefined : option[1];
    },
    map(option, map) {
        if (option === 0)
            return 0;
        return [0, map(option[1])];
    },
    mapFrom(option, map) {
        if (option === 0)
            return undefined;
        return map(option[1]);
    },
    mapTo(option, map) {
        if (option === undefined)
            return 0;
        return [0, map(option)];
    },
});
//# sourceMappingURL=base.js.map
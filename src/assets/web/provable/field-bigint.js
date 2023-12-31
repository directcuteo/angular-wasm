import { randomBytes } from '../bindings/crypto/random.js';
import { Fp, mod } from '../bindings/crypto/finite_field.js';
import { BinableBigint, ProvableBigint, } from '../bindings/lib/provable-bigint.js';
export { Field, Bool, UInt32, UInt64, Sign };
export { pseudoClass, sizeInBits, checkRange, checkField };
const sizeInBits = Fp.sizeInBits;
const minusOne = 0x40000000000000000000000000000000224698fc094cf91b992d30ed00000000n;
const checkField = checkRange(0n, Fp.modulus, 'Field');
const checkBool = checkAllowList(new Set([0n, 1n]), 'Bool');
const checkSign = checkAllowList(new Set([1n, minusOne]), 'Sign');
/**
 * The base field of the Pallas curve
 */
const Field = pseudoClass(function Field(value) {
    return mod(BigInt(value), Fp.modulus);
}, {
    ...ProvableBigint(checkField),
    ...BinableBigint(Fp.sizeInBits, checkField),
    ...Fp,
});
/**
 * A field element which is either 0 or 1
 */
const Bool = pseudoClass(function Bool(value) {
    return BigInt(value);
}, {
    ...ProvableBigint(checkBool),
    ...BinableBigint(1, checkBool),
    toInput(x) {
        return { fields: [], packed: [[x, 1]] };
    },
    toBoolean(x) {
        return !!x;
    },
    toJSON(x) {
        return !!x;
    },
    fromJSON(b) {
        let x = BigInt(b);
        checkBool(x);
        return x;
    },
    sizeInBytes() {
        return 1;
    },
    fromField(x) {
        checkBool(x);
        return x;
    },
});
function Unsigned(bits) {
    let maxValue = (1n << BigInt(bits)) - 1n;
    let checkUnsigned = checkRange(0n, 1n << BigInt(bits), `UInt${bits}`);
    let binable = BinableBigint(bits, checkUnsigned);
    let bytes = Math.ceil(bits / 8);
    return pseudoClass(function Unsigned(value) {
        let x = BigInt(value);
        checkUnsigned(x);
        return x;
    }, {
        ...ProvableBigint(checkUnsigned),
        ...binable,
        toInput(x) {
            return { fields: [], packed: [[x, bits]] };
        },
        maxValue,
        random() {
            return binable.fromBytes([...randomBytes(bytes)]);
        },
    });
}
const UInt32 = Unsigned(32);
const UInt64 = Unsigned(64);
const Sign = pseudoClass(function Sign(value) {
    if (value !== 1 && value !== -1)
        throw Error('Sign: input must be 1 or -1.');
    return mod(BigInt(value), Fp.modulus);
}, {
    ...ProvableBigint(checkSign),
    ...BinableBigint(1, checkSign),
    emptyValue() {
        return 1n;
    },
    toInput(x) {
        return { fields: [], packed: [[x === 1n ? 1n : 0n, 1]] };
    },
    fromFields([x]) {
        if (x === 0n)
            return 1n;
        checkSign(x);
        return x;
    },
    toJSON(x) {
        return x === 1n ? 'Positive' : 'Negative';
    },
    fromJSON(x) {
        if (x !== 'Positive' && x !== 'Negative')
            throw Error('Sign: invalid input');
        return x === 'Positive' ? 1n : minusOne;
    },
});
// helper
function pseudoClass(constructor, module) {
    return Object.assign(constructor, module);
}
// validity checks
function checkRange(lower, upper, name) {
    return (x) => {
        if (x < lower)
            throw Error(`${name}: inputs smaller than ${lower} are not allowed, got ${x}`);
        if (x >= upper)
            throw Error(`${name}: inputs larger than ${upper - 1n} are not allowed, got ${x}`);
    };
}
function checkAllowList(valid, name) {
    return (x) => {
        if (!valid.has(x)) {
            throw Error(`${name}: input must be one of ${[...valid].join(', ')}, got ${x}`);
        }
    };
}
//# sourceMappingURL=field-bigint.js.map
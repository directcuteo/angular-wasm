/**
 * This file contains bindings for JSOO written in TS and integrated with our normal code base.
 * It is exposed to JSOO by populating a global variable with an object.
 * It gets imported as the first thing in ../../snarky.js so that the global variable is ready by the time JSOO code gets executed.
 */
import { prefixHashes, prefixHashesLegacy } from '../crypto/constants.js';
import { Bigint256Bindings } from './bindings/bigint256.js';
import { PallasBindings, VestaBindings } from './bindings/curve.js';
import { FpBindings, FqBindings } from './bindings/field.js';
import { FpVectorBindings, FqVectorBindings } from './bindings/vector.js';
import { createRustConversion } from './bindings/conversion.js';
const tsBindings = {
    prefixHashes,
    prefixHashesLegacy,
    ...Bigint256Bindings,
    ...FpBindings,
    ...FqBindings,
    ...VestaBindings,
    ...PallasBindings,
    ...FpVectorBindings,
    ...FqVectorBindings,
    rustConversion: createRustConversion,
};
// this is put in a global variable so that ../kimchi/js/bindings.js finds it
globalThis.__snarkyTsBindings = tsBindings;
//# sourceMappingURL=bindings.js.map
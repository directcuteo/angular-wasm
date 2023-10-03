import { mapTuple } from './util.js';
export { createRustConversion };
// TODO: Hardcoding this is a little brittle
// TODO read from field
const fieldSizeBytes = 32;
function createRustConversion(wasm) {
    function wireToRust([, row, col]) {
        return wasm.Wire.create(row, col);
    }
    function perField(WasmGate) {
        return {
            vectorToRust: fieldsToRustFlat,
            vectorFromRust: fieldsFromRustFlat,
            gateToRust(gate) {
                let [, typ, [, ...wires], coeffs] = gate;
                let rustWires = new wasm.WasmGateWires(...mapTuple(wires, wireToRust));
                let rustCoeffs = fieldsToRustFlat(coeffs);
                return new WasmGate(typ, rustWires, rustCoeffs);
            },
        };
    }
    const fpConversion = perField(wasm.WasmFpGate);
    const fqConversion = perField(wasm.WasmFqGate);
    return {
        wireToRust,
        fieldsToRustFlat,
        fieldsFromRustFlat,
        fp: fpConversion,
        fq: fqConversion,
        gateFromRust(wasmGate) {
            // note: this was never used and the old implementation was wrong
            // (accessed non-existent fields on wasmGate)
            throw Error('gateFromRust not implemented');
        },
    };
}
// TODO make more performant
function fieldToRust(x) {
    return x;
}
function fieldFromRust(x) {
    return x;
}
// TODO avoid intermediate Uint8Arrays
function fieldsToRustFlat([, ...fields]) {
    let n = fields.length;
    let flatBytes = new Uint8Array(n * fieldSizeBytes);
    for (let i = 0, offset = 0; i < n; i++, offset += fieldSizeBytes) {
        let fieldBytes = fieldToRust(fields[i]);
        flatBytes.set(fieldBytes, offset);
    }
    return flatBytes;
}
function fieldsFromRustFlat(fieldBytes) {
    var n = fieldBytes.length / fieldSizeBytes;
    if (!Number.isInteger(n)) {
        throw Error('fieldsFromRustFlat: invalid bytes');
    }
    var fields = Array(n);
    for (let i = 0, offset = 0; i < n; i++, offset += fieldSizeBytes) {
        let fieldView = new Uint8Array(fieldBytes.buffer, offset, fieldSizeBytes);
        fields[i] = fieldFromRust(fieldView);
    }
    return [0, ...fields];
}
//# sourceMappingURL=conversion.js.map
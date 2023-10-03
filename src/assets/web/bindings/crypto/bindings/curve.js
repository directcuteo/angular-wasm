import { Pallas, Vesta, } from '../elliptic_curve.js';
import { withPrefix } from './util.js';
export { VestaBindings, PallasBindings, toMlOrInfinity, fromMlOrInfinity, };
const VestaBindings = withPrefix('caml_vesta', createCurveBindings(Vesta));
const PallasBindings = withPrefix('caml_pallas', createCurveBindings(Pallas));
function createCurveBindings(Curve) {
    return {
        one() {
            return Curve.one;
        },
        add: Curve.add,
        sub: Curve.sub,
        negate: Curve.negate,
        double: Curve.double,
        scale(g, [, s]) {
            return Curve.scale(g, s);
        },
        random() {
            throw Error('random not implemented');
        },
        rng(i) {
            throw Error('rng not implemented');
        },
        endo_base() {
            return [0, Curve.endoBase];
        },
        endo_scalar() {
            return [0, Curve.endoScalar];
        },
        to_affine(g) {
            return toMlOrInfinity(Curve.toAffine(g));
        },
        of_affine(g) {
            return Curve.fromAffine(fromMlOrInfinity(g));
        },
        of_affine_coordinates(x, y) {
            // allows to create in points not on the curve - matches Rust impl
            return { x: x[1], y: y[1], z: 1n };
        },
        affine_deep_copy(g) {
            return toMlOrInfinity(fromMlOrInfinity(g));
        },
    };
}
const affineZero = { x: 0n, y: 0n, infinity: true };
function toMlOrInfinity(g) {
    if (g.infinity)
        return 0;
    return [0, [0, [0, g.x], [0, g.y]]];
}
function fromMlOrInfinity(g) {
    if (g === 0)
        return affineZero;
    return { x: g[1][1][1], y: g[1][2][1], infinity: false };
}
//# sourceMappingURL=curve.js.map
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.materialize = exports.isSharedValueSelector = exports.isSharedValue = exports.composeDeclarations = void 0;
var _typeddash = require("../renderer/typeddash");
const isSharedValue = value => {
  "worklet";

  // We cannot use `in` operator here because `value` could be a HostObject and therefore we cast.
  return (value === null || value === void 0 ? void 0 : value._isReanimatedSharedValue) === true;
};
exports.isSharedValue = isSharedValue;
const isSharedValueSelector = value => {
  "worklet";

  if (!value || typeof value !== "object") {
    return false;
  }
  const obj = value;
  return isSharedValue(obj.__sv) && typeof obj.__key === "string";
};
exports.isSharedValueSelector = isSharedValueSelector;
const materialize = props => {
  "worklet";

  const result = Object.assign({}, props);
  (0, _typeddash.mapKeys)(result).forEach(key => {
    const value = result[key];
    if (isSharedValue(value)) {
      result[key] = value.value;
    } else if (isSharedValueSelector(value)) {
      const group = value.__sv.value;
      result[key] = group && typeof group === "object" ? group[value.__key] : undefined;
    }
  });
  return result;
};
exports.materialize = materialize;
const composeDeclarations = (filters, composer) => {
  "worklet";

  const len = filters.length;
  if (len <= 1) {
    return filters[0];
  }
  return filters.reduceRight((inner, outer) => inner ? composer(outer, inner) : outer);
};
exports.composeDeclarations = composeDeclarations;
//# sourceMappingURL=utils.js.map
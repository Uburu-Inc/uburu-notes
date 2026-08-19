/**
 * Binds a prop to a single key of a "grouped" shared value: one shared value
 * whose `.value` is an object can drive many props (one key each) instead of
 * requiring a separate shared value per prop.
 *
 * Created via {@link select}. `T` is the type of the selected value; `__type`
 * is a phantom marker carrying that type and is never present at runtime.
 */

/**
 * Selects a single key of a shared value so it can drive an animated prop.
 * This lets one shared value (whose value is an object) drive multiple props
 * — one per key — instead of using a separate shared value for each.
 *
 * @example
 * const data = useSharedValue({ x: 0, y: 0, r: 10 });
 * <Circle cx={select(data, "x")} cy={select(data, "y")} r={select(data, "r")} />
 */
export const select = (value, key) => ({
  __sv: value,
  __key: key
});
//# sourceMappingURL=Animations.js.map
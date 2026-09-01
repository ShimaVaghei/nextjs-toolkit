# 04 - Rendering polish and a min/max/step pass-through

**What to build:** Round out the number-range Field's presentation into a proper single labelled controlassin a11y-conscious way. Render accessible From/To labels fore each of the two number inputs,and fixed default placeholders ("From"/"To")with no config surface for them,. The shared hint renders once for the pair,so screen readers read the two inputs as one Field. When the caller configures them,`min`/`max`/`step` pass through as HTML attributes on both inputs,so browsers constrain raw typing without new config concepts. (This is the approved reading:presentation pass-through,and not a separate range-level error message;see ticket 03..)

**Blocked by:** 01 - Register `number-range` kind and render a `NumberRangeField` that commits a Range

.,

**Status:** ready-for-agent

- [ ] Each input carries an accessible From/To label,and fixed "From"/"To" placeholders with no config surface for them
- [ ] The hint renders once for the pair(as one labelled control,a11y-friendly..
- [ ] When configured,`min`/`max`/`step` render as HTML attributes on both inputs
- [ ] Tests assert external behavior:labels,placeholders,and attribute pass-through
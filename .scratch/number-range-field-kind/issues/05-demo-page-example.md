# 05 - Demo page example

**What to build:** One new example on the existing Field demo page,following the range examples. The example shows a called-in config,two editable From/To inputs,a committed value readable through an observer,and `required` messaging that appears once Touched. It exercises partial ranges(one end blank stays a committed value)and the empty-state commit,so a reviewer sees the full end-to-end behaviour berfore shipping.

.,

 **Blocked by:**: 02 - Commit pipeline,03 - Range-kind validation, and 04 - Rendering polish (each already brings its own 01.)

.,

 **Status:** ready-for-agent

- [ ] A new section appears on the demo page fora number-range Field fora named example with an observer
- [ ] Typing into either end commits the range; leaving one end blank keeps the set end
- [ ] With `required` set,the built-in message appears once Touched,and clears when both ends are set
- [ ] The example mirrors the existing range examples in structure and style
# web audio mp3 decode 

The `decodeAudioData` function provided by web audio API, when used to decode mp3 files, behaves differently across browsers. On some browsers it trims off paddings at the beginning/end of samples, while on others it doesn't. This seems to be caused by different interpretation of LAME tags. The result is decoded audio buffers have different duration and different timing.

This project aims to provide a workaround to unify the mp3 timing across browsers, by explicitly parse and then remove such info frames if applicable.

//     mp3-parser/xing v0.3.0

//     https://github.com/biril/mp3-parser
//     Licensed and freely distributed under the MIT License
//     Copyright (c) 2013-2016 Alex Lambiris

// ----

/* jshint browser:true */
/* global exports:false, define:false, require:false */
(function (globalObject, createModule) {
    "use strict";

    // Export as a module or global depending on environment:

    // Global `define` method with `amd` property signifies an AMD loader (require.js, curl.js, ..)
    if (typeof define === "function" && define.amd) {
        return define(["exports", "./lib"], createModule);
    }

    // Global `exports` object signifies CommonJS enviroments with `module.exports`, e.g. Node
    if (typeof exports === "object") {
        return createModule(exports, require("./lib"));
    }

    // If none of the above, then assume a browser sans AMD (also attach a `noConflict`)
    var previousMp3XingParser = globalObject.mp3XingParser;
    createModule(globalObject.mp3XingParser = {
        noConflict: function () {
            var mp3XingParser = globalObject.mp3XingParser;
            globalObject.mp3XingParser = previousMp3XingParser;
            return (this.noConflict = function () { return mp3XingParser; }).call();
        }
    }, globalObject.mp3ParserLib);
}(this, function (xingParser, lib) {
    "use strict";

    // ### Read the Xing Tag
    //
    // Read [Xing / Lame Tag](http://gabriel.mp3-tech.org/mp3infotag.html) located at `offset` of
    //  DataView `view`. Returns null in the event that no frame is found at `offset`
    xingParser.readXingTag = function (view, offset) {
        offset || (offset = 0);

        var tag = {
            _section: { type: "Xing", offset: offset },
            header: lib.readFrameHeader(view, offset),
            vbrinfo: {},
        };

        var head = tag.header; // Convenience shortcut

        // The Xing tag should begin with a valid frame header
        if (!head) { return null; }

        var xingOffset = offset +
            lib.getXingOffset(head.mpegAudioVersionBits, head.channelModeBits);

        // There should be at least 'offset' (header) + 4 ("Xing"/"Info") octets ahead
        if (view.byteLength < xingOffset + 4) { return null; }

        // A "Xing" or "Info" identifier should be present
        tag.identifier = (lib.isSeq(lib.seq.xing, view, xingOffset) && "Xing") ||
            (lib.isSeq(lib.seq.info, view, xingOffset) && "Info");
        if (!tag.identifier) { return null; }

        // ========== read lame vbr tags (see libmp3lame/VbrTag.c) ==========
        //   "Xing"/"Info"    4B
        //   flags            4B     big endian; same below
        //   frames           4B     if flags & 0x0001
        //   bytes            4B     if flags & 0x0002
        //   TOC            100B     if flags & 0x0004
        //   vbrscale         4B     if flags & 0x0008
        //   ???             21B
        //   ENC_DELAY      1.5B     (check for reasonable values)
        //   ENC_PADDING    1.5B     (check for reasonable values)
        // ==================================================================
        let vbroffset = 4;
        let flags = view.getUint32(xingOffset + vbroffset);
        vbroffset += 4;
        if (flags & 0x0001) {
            tag.vbrinfo.frames_raw = view.getUint32(xingOffset + vbroffset);
            vbroffset += 4;
        }
        if (flags & 0x0002) {
            tag.vbrinfo.bytes_raw = view.getUint32(xingOffset + vbroffset);
            vbroffset += 4;
        }
        if (flags & 0x0004) {
            tag.vbrinfo.toc_raw = new Array(100);
            for (let i=0; i<100; ++i)
                tag.vbrinfo.toc_raw[i] = view.getUint8(xingOffset + vbroffset + i);
            vbroffset += 100;
        }
        if (flags & 0x0008) {
            tag.vbrinfo.vbr_scale_raw = view.getUint32(xingOffset + vbroffset);
            vbroffset += 4;
        }
        // https://linux.m2osw.com/mp3-info-tag-specifications-rev0-lame-3100
        let lame_version_buffer = new Uint8Array(view.buffer, view.byteOffset + xingOffset + vbroffset, 9);
        tag.vbrinfo.lame_version = String.fromCharCode.apply(null, lame_version_buffer);
        // delay, padding
        vbroffset += 21;
        let t0 = view.getUint8(xingOffset + vbroffset);
        let t1 = view.getUint8(xingOffset + vbroffset + 1);
        let t2 = view.getUint8(xingOffset + vbroffset + 2);
        tag.vbrinfo.ENC_DELAY = (t0<<4)|(t1>>4);
        tag.vbrinfo.ENC_PADDING = ((t1&0x0f)<<8)|t2;
        if (tag.vbrinfo.ENC_DELAY<0 || tag.vbrinfo.ENC_DELAY>3000)
            tag.vbrinfo.ENC_DELAY = -1;
        if (tag.vbrinfo.ENC_PADDING<0 || tag.vbrinfo.ENC_PADDING>3000)
            tag.vbrinfo.ENC_PADDING = -1;
        // =================== read vbr tag ends ===================

        //
        tag._section.byteLength = lib.getFrameByteLength(head.bitrate, head.samplingRate,
            head.framePadding, head.mpegAudioVersionBits, head.layerDescriptionBits);
        tag._section.nextFrameIndex = offset + tag._section.byteLength;

        return tag;
    };
}));

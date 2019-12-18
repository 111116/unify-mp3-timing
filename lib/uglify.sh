#!/bin/bash
echo '// MODIFIED version of https://github.com/biril/mp3-parser' > mp3parse.min.js
echo '// Licensed and freely distributed under the MIT License' >> mp3parse.min.js
echo '// Copyright (c) 2013-2016 Alex Lambiris' >> mp3parse.min.js
minify lib.js xing.js id3v2.js main.js >> mp3parse.min.js

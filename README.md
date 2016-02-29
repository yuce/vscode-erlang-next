# Experimental Erlang/OTP Support for Visual Studio Code

This experimental extension provides Erlang/OTP support for [Visual Studio Code](https://code.visualstudio.com/).

A (Whatels)[https://github.com/yuce/whatels] server is required to be running for auto completion to work. See
[VSCode Erlang](https://marketplace.visualstudio.com/items?itemName=yuce.erlang-otp) for an extension without
the Whatels dependency (albeit without support for project modules/current module auto completion).

## Getting Started

You will need Erlang 18+, a recent version of NodeJS (4.3+) and TypeScript (17.5+) installed.
The instructions were tested on Linux and OSX (the extension itself should work on Windows too,
but that's not tested).

1. Clone this repository to `~/,vscode/extensions`,
2. Run `npm install` to retrive dependencies,
3. Run `tsc` to compile the extension,
4. Run Whatels server (see the next section),
5. Set `"erlang.enableExperimentalAutoComplete": true` in your VSCode settings,
6. Run/Restart VSCode.

### Running the Whatels Server

See the instructions and get Whatels at: https://github.com/yuce/whatels

    $ rebar3 as prod release
    $ WHATELS_PORT=10998 _build/prod/rel/whatels/bin/whatels foreground

## Thanks

* Erlang syntax file is based on: https://github.com/pgourlain/vscode_erlang.

## License

```
Copyright (c) 2016, Yuce Tekol <yucetekol@gmail.com>.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

* Redistributions of source code must retain the above copyright
  notice, this list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright
  notice, this list of conditions and the following disclaimer in the
  documentation and/or other materials provided with the distribution.

* The names of its contributors may not be used to endorse or promote
  products derived from this software without specific prior written
  permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```
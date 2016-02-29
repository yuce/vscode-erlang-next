// Copyright (c) 2016, Yuce Tekol <yucetekol@gmail.com>.
// All rights reserved.

// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:

// * Redistributions of source code must retain the above copyright
//   notice, this list of conditions and the following disclaimer.

// * Redistributions in binary form must reproduce the above copyright
//   notice, this list of conditions and the following disclaimer in the
//   documentation and/or other materials provided with the distribution.

// * The names of its contributors may not be used to endorse or promote
//   products derived from this software without specific prior written
//   permission.

// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


import {Disposable} from 'vscode';
import whatels = require('whatels');


export class WhatelsClient implements Disposable {
    private wConn: whatels.Connection;
    private port: number;
    private subscribers: whatels.CallbackFunction[] = [];

    constructor(refreshTime?: number, port?: number) {
        this.port = port || 10998;
    }

    public subscribe(callback: whatels.CallbackFunction) {
        this.subscribers.push(callback);
    }

    public getPathSymbols(path: string): Thenable<whatels.Symbols> {
        return new Promise<whatels.Symbols>((resolve, reject) => {
            this._connect().then(
                conn => resolve(conn.getPathSymbols(path)),
                err => reject(err)
            )
        });
    }

    public getAllPathSymbols(): Thenable<{[index: string]: whatels.Symbols}> {
        return new Promise<{[index: string]: whatels.Symbols}>((resolve, reject) => {
            this._connect().then(
                conn => resolve(conn.getAllPathSymbols()),
                err => reject(err)
            )
        });
    }

    public watch(wildcard: string) {
        console.log('watch: ', wildcard);
        this._connect().then(
            conn => {
                conn.watch(wildcard);
            },
            err => console.error(err)
        );
    }

    public dispose() {
        this.wConn.close();
        this.wConn = null;
    }

    private _connect(): Thenable<whatels.Connection> {
        let callback = (action: whatels.CallbackAction, msg: any) => {
            this.subscribers.forEach(cb => {
                cb(action, msg);
            });
        }

        return new Promise<whatels.Connection>((resolve, reject) => {
            if (this.wConn) {
                resolve(this.wConn);
            }
            else {
                this.wConn = new whatels.Connection(this.port);
                this.wConn.connect(callback).then(
                    () => resolve(this.wConn),
                    err => reject(err)
                );
            }
        });
    }
}
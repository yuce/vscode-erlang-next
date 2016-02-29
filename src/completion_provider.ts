/// <ref href="../typings/tsd.d.ts">

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

import {CompletionItemProvider, TextDocument, Position, CancellationToken,
        CompletionItem, CompletionItemKind} from 'vscode';
import {Symbols, FunctionInfo, CallbackAction} from 'whatels';
import {WhatelsClient} from './whatels_client';
import fs = require('fs');
import path = require('path');

const RE_MODULE = /(\w+):$/;

export class ErlangCompletionProvider implements CompletionItemProvider {
    private stdModules: any = null;
    private moduleNames: string[] = null;
    private docPath: string;
    private genericCompletionItems: CompletionItem[] = null;
    private moduleCompletionItems: CompletionItem[] = null;
    private stdLibCompletionItems: CompletionItem[] = null;
    private workspaceCompletionItems: CompletionItem[] = null;

    constructor(private whatelsClient: WhatelsClient,
                private completionPath: string)
    {
        whatelsClient.subscribe((action, msg) => {
            if (action == CallbackAction.getSymbols) {
                this.genericCompletionItems = null;
                if (msg.path == this.docPath) {
                    // invalidate completion items of the current doc
                    this.docPath = '';
                    this.moduleCompletionItems = null;
                }
            }
            else if (action == CallbackAction.discardPath) {
                this.genericCompletionItems = null;
            }
        });
    }

    public provideCompletionItems(doc: TextDocument,
                                  pos: Position,
                                  token: CancellationToken): Thenable<CompletionItem[]>
    {
        return new Promise<CompletionItem[]>((resolve, reject) => {
	        const line = doc.lineAt(pos.line);
            const m = RE_MODULE.exec(line.text.substring(0, pos.character));
            if (m === null) {
                this.resolveGenericItems(resolve, reject, doc.fileName);
            }
            else {
                this.resolveModuleItems(resolve, reject, m[1]);
            }
        });
    }

    private resolveGenericItems(resolve, reject, path: string) {
        this.getGenericCompletionItems(path).then(
            items => resolve(items),
            err => reject(err)
        )
    }

    private resolveModuleItems(resolve, reject, moduleName: string) {
        this.getModuleCompletionItems(moduleName).then(
            items => resolve(items),
            err => reject(err)
        );
    }

    private getGenericCompletionItems(path: string): Thenable<CompletionItem[]> {
        return new Promise<CompletionItem[]>((resolve, reject) => {
            if (this.genericCompletionItems) {
                resolve(this.genericCompletionItems);
            }
            else {
                let cis: CompletionItem[] = [];
                Promise.all([this.getCurrentModuleCompletionItems(path),
                             this.getWorkspaceCompletionItems(),
                             this.getStdLibCompletionItems()]).then(
                    allCompletionItems => {
                        allCompletionItems.forEach(items => {
                            items.forEach(ci => cis.push(ci));
                        });
                        resolve(cis);
                    },
                    err => reject(err)
                );
                this.genericCompletionItems = cis;
            }
        });
    }

    private getCurrentModuleCompletionItems(path: string): Thenable<CompletionItem[]> {
        return new Promise<CompletionItem[]>((resolve, reject) => {
            if (this.moduleCompletionItems && path == this.docPath) {
                resolve(this.moduleCompletionItems);
            }
            else {
                this.whatelsClient.getPathSymbols(path).then(
                    symbols => {
                        this.docPath = path;
                        resolve(this.createCurrentModuleCompletionItems(path, symbols));
                    },
                    err => reject(err)
                );
            }
        });
    }

    private getStdLibCompletionItems(): Thenable<CompletionItem[]> {
        return new Promise<CompletionItem[]>((resolve, reject) => {
            if (this.stdLibCompletionItems) {
                resolve(this.stdLibCompletionItems);
            }
            else {
                this.readCompletionJson(this.completionPath, modules => {
                    this.stdModules = modules;
                    resolve(this.createStdLibCompletionItems(modules));
                });
            }
        });
    }

    private getWorkspaceCompletionItems(): Thenable<CompletionItem[]> {
        return new Promise<CompletionItem[]>((resolve, reject) => {
            if (this.workspaceCompletionItems) {
                resolve(this.workspaceCompletionItems);
            }
            else {
                this.whatelsClient.getAllPathSymbols().then(
                    pathSymbols => resolve(this.createWorkspaceCompletionItems(pathSymbols)),
                    err => reject(err)
                );
            }
        });
    }

    private getModuleCompletionItems(moduleName: string): Thenable<CompletionItem[]> {
        return new Promise<CompletionItem[]>((resolve, reject) => {
            let stdLibFunsPromise = new Promise<void>((resolve, reject) => {
                if (this.stdModules) {
                    resolve();
                }
                else {
                    this.readCompletionJson(this.completionPath, modules => {
                        this.stdModules = modules;
                        resolve();
                    });
                }
            });
            let moduleFunsPromise = new Promise<any>((resolve, reject) => {
                this.whatelsClient.getAllPathSymbols().then(
                    pathSymbols => resolve(pathSymbols),
                    err => reject(err)
                );
            });
            Promise.all([stdLibFunsPromise, moduleFunsPromise]).then(
                values => {
                    resolve(this.createModuleCompletionItems(moduleName, values[1]));
                },
                err => reject(err)
            );
        });
    }

    private createCurrentModuleCompletionItems(path: string, symbols: Symbols) {
        let cis: CompletionItem[] = [];
        if (symbols && symbols.functions) {
            let funNames = new Set(symbols.functions.map(f => {
                return f.name;
            }));
            funNames.forEach(name => {
                var item = new CompletionItem(name);
                item.kind = CompletionItemKind.Function;
                cis.push(item);
            });
        }
        return this.moduleCompletionItems = cis;
    }

    private createStdLibCompletionItems(modules) {
        let cis: CompletionItem[] = [];
        for (var k in modules) {
            var item = new CompletionItem(k);
            item.kind = CompletionItemKind.Module;
            item.detail = 'OTP module';
            cis.push(item);
        }
        return this.stdLibCompletionItems = cis;
    }

    private createWorkspaceCompletionItems(pathSymbols) {
        let cis: CompletionItem[] = [];
        for (var p in pathSymbols) {
            var item = new CompletionItem(path.basename(p, '.erl'));
            item.kind = CompletionItemKind.Module;
            item.detail = 'Project module';
            cis.push(item);
        }
        console.log('createWorkspaceCompletionItems');
        return this.workspaceCompletionItems = cis;
    }

    private createModuleCompletionItems(moduleName: string, pathSymbols) {
        let cis: CompletionItem[] = [];
        var item: CompletionItem;
        var symbols: any;

        for (var p in pathSymbols) {
            if (path.basename(p, '.erl') == moduleName) {
                symbols = pathSymbols[p] || {};
                (symbols.functions || []).forEach(f => {
                    var item = new CompletionItem(f.name);
                    item.kind = CompletionItemKind.Function;
                    cis.push(item);
                });
                break;
            }
        }
        (this.stdModules[moduleName] || []).forEach(f => {
            var item = new CompletionItem(f);
            item.kind = CompletionItemKind.Function;
            cis.push(item);
        });

        return cis;
    }

    private readCompletionJson(filename: string, done: Function): any {
        fs.readFile(filename, 'utf8', (err, data) => {
            if (err) {
                console.log(`Cannot read: ${filename}`);
                done({});
            }
            else {
                let d: any = JSON.parse(data);
                done(d);
            }
        });
    }
}
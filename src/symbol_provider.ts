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

import {DocumentSymbolProvider, WorkspaceSymbolProvider, TextDocument,
        CancellationToken, SymbolInformation, SymbolKind,
        Range, Uri} from 'vscode';
import {Symbols, CallbackAction} from 'whatels';
import {WhatelsClient} from './whatels_client';


export class ErlangDocumentSymbolProvider implements DocumentSymbolProvider {
    private symbols: SymbolInformation[] = null;
    private symbolsPath: string;

    constructor(private whatelsClient: WhatelsClient) {
        let cb = (action: CallbackAction, msg: any) => {
            if (action == CallbackAction.getSymbols && msg.path == this.symbolsPath) {
                console.log(`ErlangDocumentSymbolProvider: Invalidating symbols - ${this.symbolsPath}`);
                this.symbols = null;
                this.symbolsPath = '';
            }
        }
        whatelsClient.subscribe(cb);
    }

    public provideDocumentSymbols(doc: TextDocument, token: CancellationToken)
        :Thenable<SymbolInformation[]>
    {
        return new Promise<SymbolInformation[]>((resolve, reject) => {
            console.log('ErlangDocumentSymbolProvider: get doc symbol informations');
            if (!this.symbols || this.symbolsPath != doc.fileName) {
                this.whatelsClient.getPathSymbols(doc.fileName).then(
                    symbols => {
                        this.symbolsPath = doc.fileName;
                        this.createSymbolInformations(symbols);
                        this.resolveItems(resolve);
                    },
                    err => reject(err)
                )
            }
            else {
                this.resolveItems(resolve);
            }
        });
    }

    private resolveItems(resolve) {
        resolve(this.symbols || []);
    }

    private createSymbolInformations(symbols: Symbols) {
        if (!symbols) {
            this.symbols = null;
            return;
        }
        // TODO: sort symbols by name
        this.symbols = symbols.functions.map(f => {
            let range = new Range(f.line - 1, 0, f.line - 1, 0);
            let name = `${f.name}/${f.arity}`;
            return new SymbolInformation(name, SymbolKind.Function, range);
        });
    }
}

export class ErlangWorkspaceDocumentSymbolProvider implements WorkspaceSymbolProvider {
    private symbols: {[index: string]: SymbolInformation[]} = null;

    constructor(private whatelsClient: WhatelsClient) {
        let cb = (action: CallbackAction, msg: any) => {
            if (action == CallbackAction.getSymbols || action == CallbackAction.discardPath) {
                if (this.symbols) {
                    console.log(`ErlangWorkspaceDocumentSymbolProvider: Invalidating symbols - ${msg.path}`);
                    this.symbols[msg.path] = null;
                }

            }
        }
        whatelsClient.subscribe(cb);
    }

    public provideWorkspaceSymbols(query: string, token: CancellationToken)
        :SymbolInformation[] | Thenable<SymbolInformation[]>
    {
        return new Promise<SymbolInformation[]>((resolve, reject) => {
            console.log('ErlangWorkspaceDocumentSymbolProvider: get doc symbol informations');
            if (!this.symbols) {
                this.whatelsClient.getAllPathSymbols().then(
                    symbols => {
                        this.createSymbolInformations(symbols);
                        this.resolveItems(resolve, query);
                    },
                    err => reject(err)
                );
            }
            else {
                this.resolveItems(resolve, query);
            }
        });
    }

    private resolveItems(resolve, query) {
        let sis: SymbolInformation[] = [];
        if (!this.symbols) {
            resolve([]);
        }
        for (var k in this.symbols) {
            var symbols = this.symbols[k] || [];
            symbols.forEach(sym => {
                if (sym.name.indexOf(query) >= 0) {
                    sis.push(sym);
                }
            });
        }
        resolve(sis);
    }

    private createSymbolInformations(pathSymbols: {[index: string]: Symbols}) {
        if (!this.symbols) {
            this.symbols = {};
        }
        for (var path in pathSymbols) {
            this.symbols[path] = [];
            var symbols = pathSymbols[path];
            pathSymbols[path].functions.forEach(f  => {
                const range = new Range(f.line - 1, 0, f.line - 1, 0);
                const uri = Uri.file(path);
                const name = `${symbols.module}:${f.name}/${f.arity}`;
                var si = new SymbolInformation(name,
                                               SymbolKind.Function,
                                               range,
                                               uri);
                this.symbols[path].push(si);
            });
        }
    }

}
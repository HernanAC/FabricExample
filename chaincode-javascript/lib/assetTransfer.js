/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic JSON.stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');

class AssetTransfer extends Contract {

    async InitLedger(ctx) {
        const assets = [
            {
                ID: 'icecream1',
                Flavor: 'chocolate',
                Size: 'medium',
                Client: 'Paola',
                Cone: 'sugar',
                Value: 10000,
            },
            {
                ID: 'icecream2',
                Flavor: 'vanilla',
                Size: 'small',
                Client: 'Martha',
                Cone: 'waffle',
                Value: 6000,
            },
            {
                ID: 'icecream3',
                Flavor: 'mint',
                Size: 'big',
                Client: 'Anna',
                Cone: 'cake',
                Value: 15000,
            },
            {
                ID: 'icecream4',
                Flavor: 'strawberry',
                Size: 'big',
                Client: 'Pablo',
                Cone: 'waffle',
                Value: 15000,
            },
            {
                ID: 'icecream5',
                Flavor: 'vanilla',
                Size: 'medium',
                Client: 'Manuel',
                Cone: 'cake',
                Value: 10000,
            },
            {
                ID: 'icecream6',
                Flavor: 'chocolate',
                Size: 'small',
                Client: 'Augusto',
                Cone: 'sugar',
                Value: 6000,
            },
            {
                ID: 'icecream7',
                Flavor: 'mint',
                Size: 'big',
                Client: 'Victoria',
                Cone: 'waffle',
                Value: 15000,
            },
            {
                ID: 'icecream8',
                Flavor: 'vanilla',
                Size: 'small',
                Client: 'Sandra',
                Cone: 'cake',
                Value: 6000,
            },
            {
                ID: 'icecream9',
                Flavor: 'brownie',
                Size: 'medium',
                Client: 'Hector',
                Cone: 'cake',
                Value: 10000,
            },
        ];

        for (const asset of assets) {
            asset.docType = 'asset';
            // example of how to write to world state deterministically
            // use convetion of alphabetic order
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            // when retrieving data, in any lang, the order of data will be the same and consequently also the corresonding hash
            await ctx.stub.putState(asset.ID, Buffer.from(stringify(sortKeysRecursive(asset))));
        }
    }

    // CreateAsset issues a new asset to the world state with given details.
    async CreateAsset(ctx, id, flavor, size, client, cone, value) {
        const exists = await this.AssetExists(ctx, id);
        if (exists) {
            throw new Error(`The asset ${id} already exists`);
        }

        const asset = {
            ID: id,
            Flavor: flavor,
            Size: size,
            Client: client,
            Cone: cone,
            Value: value,
        };
        //we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return JSON.stringify(asset);
    }

    // ReadAsset returns the asset stored in the world state with given id.
    async ReadAsset(ctx, id) {
        const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    // UpdateAsset updates an existing asset in the world state with provided parameters.
    async UpdateAsset(ctx, id, flavor) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        const assetString = await this.ReadAsset(ctx, id);
        const asset = JSON.parse(assetString);
        // overwriting original asset with new asset
        const updatedAsset = {
            ID: id,
            Flavor: flavor,
            Size: asset.Size,
            Client: asset.Client,
            Cone: asset.Cone,
            Value: asset.Value,
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
    }

    // DeleteAsset deletes an given asset from the world state.
    async DeleteAsset(ctx, id) {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    // AssetExists returns true when asset with given ID exists in world state.
    async AssetExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    // TransferAsset updates the owner field of asset with given id in the world state.
    async TransferAsset(ctx, id, newOwner) {
        const assetString = await this.ReadAsset(ctx, id);
        const asset = JSON.parse(assetString);
        const oldOwner = asset.Client;
        asset.Client = newOwner;
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return oldOwner;
    }

    // GetAllAssets returns all assets found in the world state.
    async GetAllAssets(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }
}

module.exports = AssetTransfer;

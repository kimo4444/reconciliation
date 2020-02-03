var fs = require('fs');

const createSectionsObj = (keys, input) => {
    const inputObj = {}
    for (let i = 0; i < keys.length; i++) {
        let startIndex = input.indexOf(keys[i]);
        // index of the end element for slicing or if it's undefined the index of the last item in input.
        let endIndex = keys[i + 1] ? input.indexOf(keys[i + 1]) : input.length;
        inputObj[keys[i]] = input.slice(startIndex + 1, endIndex);
    }
    return inputObj;
};

const calculateExpectedOutput = (transactions, d0Pos) => {
    let expectedOutput = { ...d0Pos };
    transactions.map(item => {
        let { symbol, code, shares, total } = item;
        if (!(symbol in expectedOutput)) {
            expectedOutput[symbol] = 0;
        };
        switch (code) {
            case 'DIVIDEND':
            case 'DEPOSIT':
                // adds shares in case of stock dividends
                expectedOutput[symbol] += Number(shares);
                expectedOutput['Cash'] += Number(total);
                break;
            case 'FEE':
                expectedOutput['Cash'] -= Number(total);
                break;
            case 'BUY':
                expectedOutput[symbol] += Number(shares);
                expectedOutput['Cash'] -= Number(total);
                break;
            case 'SELL':
                expectedOutput[symbol] -= Number(shares);
                expectedOutput['Cash'] += Number(total);
                break;
            default:
                console.error('Unknown operation');
        }
    });
    return expectedOutput;
};

const convertBySection = (placeholder, obj) => {
    for (let item of obj) {
        if (Array.isArray(placeholder)) {
            // unpacks values by item type
            let [symbol, code, shares, total] = item.split(" ");
            placeholder.push({ symbol, code, shares, total });
        } else {
            let [symbol, shares] = item.split(" ");
            placeholder[symbol] = Number(shares);
        }
    }
    return placeholder;
};

const mergeKeys = (obj1, obj2) => {
    for (let key in obj1) {
        if (!(key in obj2)) {
            obj2[key] = 0;
        };
    };
};

const reconcileDifference = (obj1, obj2) => {
    return (Object.keys(obj1).reduce((item, index) => {
        item[index] = (obj2[index]) - (obj1[index]);
        return item;
    }, {}));
};

const removeZeroValues = (data) => {
    let output = ``;
    for (let key in data) {
        if (data[key] !== 0) {
            output += `${key} ${data[key]}\n`;
        }
    }
    return output;
}

const readInput = (file) => {
    // async
    return new Promise((resolve, reject) => {
        fs.readFile(file, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    })
}

const writeOutput = (file, data) => {
    // only write values that are not consistent with the expected output
    const output = removeZeroValues(data)
    fs.writeFile(file, output, (err) => {
        if (err) throw err;
        else console.log(`${file} written successfully`)
    });
};

readInput('recon.in').then((data) => {
    const input = data.toString().split(/[\r?\n]+/);
    const keys = ['D0-POS', 'D1-TRN', 'D1-POS'];
    // Converts input array to object, where key is a section title and 
    // value is an array of records.
    const inputObj = createSectionsObj(keys, input);

    // In case of account positions (D0POS, D1POS) create an object: {symbol: shares}, 
    // in case of transactions ('D1-TRN') create an array of 
    // transactions objects [{symbol: val, code: val, shares:val, total: val},  ... ]
    const d0PositionsObj = convertBySection({}, inputObj['D0-POS']);
    const transactionsArr = convertBySection([], inputObj['D1-TRN']);
    const d1PositionsObj = convertBySection({}, inputObj['D1-POS']);

    const expectedOutputObj = calculateExpectedOutput(transactionsArr, d0PositionsObj);

    // If key exists in expected output object but not in day 1 positions object, or vice versa,
    // add a key with a value of zero to that object.
    mergeKeys(expectedOutputObj, d1PositionsObj);
    mergeKeys(d1PositionsObj, expectedOutputObj);

    writeOutput('recon.out', reconcileDifference(expectedOutputObj, d1PositionsObj));
});

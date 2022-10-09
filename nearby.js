const Csv = require("fast-csv");
const geolib = require("geolib");
const _ = require("lodash");

const csvOptions = {
    discardUnmappedColumns: true,
    headers: true,
    ignoreEmpty: true,
    trim: true,
};

function findCoordinates(zipcode, datafile, columns) {
    return new Promise((resolve, reject) => {
        Csv.fromPath(datafile, csvOptions)
            .validate((data) => {
                return (
                    data &&
                    _.has(data, columns.long) &&
                    !_.isEmpty(data[columns.long]) &&
                    _.has(data, columns.lat) &&
                    !_.isEmpty(data[columns.lat]) &&
                    _.has(data, columns.zipcode) &&
                    !_.isEmpty(data[columns.zipcode])
                );
            })
            .on("data-invalid", (data) => {
                // console.log('Missing zipcode or longitude or latitude', data);
            })
            .on("data", (data) => {
                if (zipcode === data[columns.zipcode]) {
                    resolve({
                        latitude: data[columns.lat],
                        longitude: data[columns.long],
                    });
                }
            })
            .on("end", () => {
                reject(new Error(`Cannot find zipcode ${zipcode}}`));
            });
    });
}

function findNear(center, radius, datafile, columns) {
    return new Promise((resolve, reject) => {
        const matches = [];

        Csv.fromPath(datafile, csvOptions)
            .validate((data) => {
                return (
                    data &&
                    _.has(data, columns.long) &&
                    !_.isEmpty(data[columns.long]) &&
                    _.has(data, columns.lat) &&
                    !_.isEmpty(data[columns.lat]) &&
                    _.has(data, columns.zipcode) &&
                    !_.isEmpty(data[columns.zipcode])
                );
            })
            .on("data-invalid", (data) => {
                // console.log('Missing zipcode or longitude or latitude', data);
            })
            .on("data", (data) => {
                const distance = geolib.getDistance(center, {
                    latitude: data[columns.lat],
                    longitude: data[columns.long],
                });

                if (distance <= radius) {
                    matches.push({
                        zipcode: data[columns.zipcode],
                        city: data[columns.city],
                        state: data[columns.state],
                        lat: data[columns.lat],
                        long: data[columns.long],
                    });
                }
            })
            .on("end", () => {
                resolve(matches);
            });
    });
}

module.exports = {
    near(origin, distance, options) {
        const datafile =
            options && options.datafile !== undefined
                ? options.datafile
                : "zipcodes.csv";
        const columns = {
            long: options && options.long !== undefined ? options.long : "Long",
            lat: options && options.lat !== undefined ? options.lat : "Lat",
            zipcode:
                options && options.zipcode !== undefined
                    ? options.zipcode
                    : "Zipcode",
            city: "City",
            state: "State",
        };

        if (
            _.isObject(origin) &&
            _.has(origin, "longitude") &&
            _.has(origin, "latitude")
        ) {
            return findNear(origin, distance, datafile, columns);
        }

        return new Promise((resolve, reject) => {
            findCoordinates(origin, datafile, columns)
                .then((center) => {
                    findNear(center, distance, datafile, columns)
                        .then((zipcodes) => {
                            resolve(zipcodes);
                        })
                        .catch((err) => {
                            reject(err);
                        });
                })
                .catch((err) => {
                    reject(err);
                });
        });
    },
};

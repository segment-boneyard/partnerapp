const { processEvents } = require('./index');
const fs = require('fs');

var nock = require('nock');

test("Page: Anonymous User Navigates to Homepage", done => {
    const payload = read("fixtures/1-page.json")

    const req = expectedRequest(/page event received/)

    const cb = function (error, result) {
        expect(req.done())
        expect(error).toBe(null)
        expect(result).toMatchObject(expectedResult)
        done()
    }

    processEvents(payload, null, cb)
})

test("Page: Anonymous User Navigates to Signup Page", done => {
    const payload = read("fixtures/2-page.json")

    // user setting changes request
    payload.settings.textTemplate = "Hello ${event.name}"
    const req = expectedRequest(/Hello Signup/)

    const cb = function (error, result) {
        expect(req.done())
        expect(error).toBe(null)
        expect(result).toMatchObject(expectedResult)
        done()
    }

    processEvents(payload, null, cb)
})

test("Identify: Identify Anonymous User", done => {
    const payload = read("fixtures/3-identify.json")

    const cb = function (error, result) {
        expect(error.name).toEqual("EventNotSupported")
        expect(result).toBe(undefined)
        done()
    }

    processEvents(payload, null, cb)
})

test("Track: User Signs Up", done => {
    const payload = read("fixtures/4-track.json")

    const req = expectedRequest(/track event received/)

    const cb = function (error, result) {
        expect(req.done())
        expect(error).toBe(null)
        expect(result).toMatchObject(expectedResult)
        done()
    }

    processEvents(payload, null, cb)
})

test("Group: User is Grouped into myUsers", done => {
    const payload = read("fixtures/5-group.json")

    expect(() => {
        processEvents(payload, null, cb)
    }).toThrow()

    done()
})

test("Track: User enables an Integration", done => {
    const payload = read("fixtures/6-track.json")

    // user setting changes request
    payload.settings.textTemplate = "Hello ${event.event}"
    const req = expectedRequest(/Hello Integration Enabled/)

    const cb = function (error, result) {
        expect(req.done())
        expect(error).toBe(null)
        expect(result).toMatchObject(expectedResult)
        done()
    }

    processEvents(payload, null, cb)
})

test("Track: User Invites a Teammate", done => {
    const payload = read("fixtures/7-track.json")

    // bad user setting returns an error
    payload.settings.textTemplate = "Hello ${"

    const cb = function (error, result) {
        expect(error.name).toEqual("ValidationError")
        expect(result).toBe(undefined)
        done()
    }

    processEvents(payload, null, cb)
})

test("Screen: User Opens Mobile Application", done => {
    const payload = read("fixtures/8-screen.json")

    const req = expectedRequest(/screen event received/)

    const cb = function (error, result) {
        expect(req.done())
        expect(error).toBe(null)
        expect(result).toMatchObject(expectedResult)
        done()
    }

    processEvents(payload, null, cb)
})

function expectedRequest(requestBody) {
    return nock("https://hooks.slack.com")
        .post(/\/services\/.*/, requestBody, {
            reqHeaders: {
                "Authorization": "Basic abcd1234",
            },
        })
        .reply(200);
}

const expectedResult = {
    request: {
        hostname: 'hooks.slack.com',
        path: '/services/%3CREDACTED%3E',
        protocol: 'https:',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Basic abcd1234'
        },
        proto: 'https',
        port: 443,
        host: 'hooks.slack.com:443'
    },
    response: {
        statusCode: 200,
        body: '',
        headers: {},
    }
}

function read(path) {
    const buf = fs.readFileSync(path)
    return JSON.parse(buf)
}
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const moment_1 = __importDefault(require("moment"));
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const NAMESPACE = '123e4567-e89b-12d3-a456-426614174000'; // UUID válida
const OPENCAGE_API_KEY = 'b7dae4a8c2e34bfdb672ac687f542cc0'; // Sua chave de API do OpenCage
function generateEventUUID(title, date, location) {
    const name = `${title}_${date}_${location}`;
    return (0, uuid_1.v5)(name, NAMESPACE);
}
function scrollToBottom(page_1) {
    return __awaiter(this, arguments, void 0, function* (page, maxClicks = 15) {
        for (let i = 0; i < maxClicks; i++) {
            yield page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            yield page.waitForTimeout(1000);
        }
    });
}
function formatDate(dateStr) {
    console.log("Original date string:", dateStr);
    if (!dateStr) {
        console.log("Erro: String de data vazia.");
        return null;
    }
    const patterns = [
        { regex: /(\w+) (\d+) AT (\d{1,2}:\d{2}\s*(?:AM|PM)) – (\w+) (\d+) AT (\d{1,2}:\d{2}\s*(?:AM|PM)) (\d{4}) EDT/, monthFormat: 'MMM' },
        { regex: /(\w+), (\w+) (\d+), (\d{4}) AT (\d{1,2}:\d{2}\s*(?:AM|PM)) – (\d{1,2}:\d{2}\s*(?:AM|PM))/, monthFormat: 'MMMM' }
    ];
    for (const { regex, monthFormat } of patterns) {
        const match = regex.exec(dateStr);
        if (match) {
            let startMonth, startDay, startTime, endMonth, endDay, endTime, year;
            if (match.length === 8) {
                [, startMonth, startDay, startTime, endMonth, endDay, endTime, year] = match;
            }
            else if (match.length === 7) {
                [, , startMonth, startDay, year, startTime, endTime] = match;
                endDay = startDay;
                endMonth = startMonth;
            }
            const startDate = (0, moment_1.default)(`${startDay} ${startMonth} ${year} ${startTime}`, `DD ${monthFormat} YYYY hh:mm A`);
            const endDate = (0, moment_1.default)(`${endDay} ${endMonth} ${year} ${endTime}`, `DD ${monthFormat} YYYY hh:mm A`);
            if (endDate.isBefore(startDate)) {
                endDate.add(1, 'days');
            }
            const formattedStartDate = startDate.format("DD/MM/YYYY [at] hh:mm A");
            const formattedEndDate = endDate.format("DD/MM/YYYY [at] hh:mm A");
            console.log("Formatted start date:", formattedStartDate);
            console.log("Formatted end date:", formattedEndDate);
            return [formattedStartDate, formattedEndDate];
        }
    }
    console.log("Erro: Formato de data inválido.");
    return null;
}
function getCoordinates(locationText) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!locationText) {
            console.log("Localização não encontrada para o evento.");
            return [null, null];
        }
        const geocodeLocation = (query) => __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get('https://api.opencagedata.com/geocode/v1/json', {
                    params: {
                        q: query,
                        key: OPENCAGE_API_KEY,
                        limit: 1
                    }
                });
                const locations = response.data.results;
                if (locations.length > 0) {
                    const location = locations[0].geometry;
                    return [parseFloat(location.lat), parseFloat(location.lng)];
                }
            }
            catch (e) {
                console.log(`Erro ao obter coordenadas para ${query}: ${e}`);
            }
            return [null, null];
        });
        console.log(`Tentando obter coordenadas para: ${locationText}`);
        // Primeira tentativa com a localização completa
        let [latitude, longitude] = yield geocodeLocation(locationText + ", Montreal, Quebec, Canada");
        // Segunda tentativa com apenas o endereço da rua
        if (!latitude && !longitude) {
            const streetAddress = locationText.split(',')[0];
            console.log(`Tentando obter coordenadas para endereço simplificado: ${streetAddress}`);
            [latitude, longitude] = yield geocodeLocation(streetAddress + ", Montreal, Quebec, Canada");
        }
        if (!latitude && !longitude) {
            console.log(`Não foi possível obter coordenadas para ${locationText}`);
        }
        else {
            console.log(`Coordenadas obtidas: Latitude ${latitude}, Longitude ${longitude}`);
        }
        return [latitude, longitude];
    });
}
function openGoogleMaps(latitude, longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
function scrapeEventbriteEvents(browser_1, url_1) {
    return __awaiter(this, arguments, void 0, function* (browser, url, maxPages = 3) {
        var _a;
        const page = yield browser.newPage();
        yield page.goto(url, { waitUntil: 'networkidle2' });
        yield page.setViewport({ width: 1280, height: 800 });
        const allEvents = [];
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            console.log(`Scraping Eventbrite page ${pageNum}`);
            yield page.waitForTimeout(2000);
            const pageContent = yield page.content();
            const $ = cheerio.load(pageContent);
            const events = $('div.discover-search-desktop-card');
            for (const event of events.toArray()) {
                const eventLink = $(event).find('a.event-card-link');
                if (!eventLink.length) {
                    continue;
                }
                const eventUrl = 'https://www.eventbrite.com' + (((_a = eventLink.attr('href')) === null || _a === void 0 ? void 0 : _a.startsWith('/')) ? eventLink.attr('href') : '');
                try {
                    yield page.goto(eventUrl, { waitUntil: 'networkidle2' });
                }
                catch (e) {
                    console.log(`Timeout ao carregar o evento: ${eventUrl}`);
                    continue;
                }
                yield page.waitForTimeout(2000);
                const eventPageContent = yield page.content();
                const eventPage = cheerio.load(eventPageContent);
                const eventTitleElem = eventPage('h1.event-title.css-0');
                if (!eventTitleElem.length) {
                    yield page.goBack();
                    continue;
                }
                let eventTitle = eventTitleElem.text().trim();
                if (eventTitle.includes("Log InLog In")) {
                    eventTitle = eventTitle.replace("Log InLog In", "").trim();
                }
                const descriptionElem = eventPage('p.summary');
                const description = descriptionElem.length ? descriptionElem.text().trim() : '';
                const locationElem = eventPage('p.location-info__address-text');
                const locationText = locationElem.length ? locationElem.text().trim() : '';
                const [latitude, longitude] = yield getCoordinates(locationText);
                const googleMapsUrl = latitude && longitude ? openGoogleMaps(latitude, longitude) : '';
                const locationDetails = {
                    'Location': locationText,
                    'Latitude': latitude,
                    'Longitude': longitude,
                    'GoogleMaps_URL': googleMapsUrl
                };
                const dateText = eventPage('span.date-info__full-datetime').text().trim() || '';
                console.log("Date text:", dateText);
                let startTime = null;
                let endTime = null;
                if (dateText) {
                    const match = dateText.match(/(\d{1,2}:\d{2}\s?[AP]M)\s?–\s?(\d{1,2}:\d{2}\s?[AP]M)/);
                    if (match) {
                        [startTime, endTime] = match.slice(1);
                    }
                    else if (dateText.toLowerCase().includes("at")) {
                        const timeMatch = dateText.match(/(\d{1,2}:\d{2}\s?[AP]M)/);
                        if (timeMatch) {
                            startTime = timeMatch[1];
                        }
                    }
                }
                if (!eventTitle || !dateText || !locationText) {
                    yield page.goBack();
                    continue;
                }
                const formattedDates = formatDate(dateText);
                if (!formattedDates) {
                    console.log(`Ignoring event with invalid date: ${eventTitle}`);
                    yield page.goBack();
                    continue;
                }
                const [formattedStartDate, formattedEndDate] = formattedDates;
                const eventUUID = generateEventUUID(eventTitle, formattedStartDate, locationText);
                const priceElem = eventPage('div.conversion-bar__panel-info');
                const price = priceElem.length ? priceElem.text().trim() : 'undisclosed price';
                const imageElem = eventPage('img.event-card-image');
                const imageURL = imageElem.attr('src') || '';
                const organizerElem = eventPage('div.descriptive-organizer-info-mobile__name');
                const organizer = organizerElem.length ? organizerElem.text().trim() : '';
                const eventInfo = Object.assign(Object.assign({ 'Title': eventTitle, 'Description': description, 'Date': formattedStartDate, 'StartTime': startTime, 'EndTime': endTime }, locationDetails), { 'EventUrl': eventUrl, 'ImageURL': imageURL, 'Organizer': organizer, 'UUID': eventUUID });
                allEvents.push(eventInfo);
                yield page.goBack();
            }
            const nextButton = yield page.$('button[data-spec="page-next"]');
            if (nextButton) {
                yield nextButton.click();
                yield page.waitForTimeout(3000);
            }
            else {
                break;
            }
        }
        yield page.close();
        return allEvents;
    });
}
function scrapeFacebookEvents(browser_1, url_1) {
    return __awaiter(this, arguments, void 0, function* (browser, url, maxScroll = 50) {
        var _a;
        const page = yield browser.newPage();
        yield page.goto(url, { waitUntil: 'networkidle2' });
        yield page.setViewport({ width: 1280, height: 800 });
        const allEvents = [];
        const uniqueEventTitles = new Set();
        yield scrollToBottom(page, maxScroll);
        const pageContent = yield page.content();
        const $ = cheerio.load(pageContent);
        const events = $('div.x1qjc9v5.x9f619.x78zum5.xdt5ytf.x5yr21d.x6ikm8r.x10wlt62.xexx8yu.x10ogl3i.xg8j3zb.x1k2j06m.xlyipyv.xh8yej3');
        for (const event of events.toArray()) {
            const eventLink = $(event).find('a[href]');
            if (!eventLink.length) {
                continue;
            }
            const eventUrl = 'https://www.facebook.com' + (((_a = eventLink.attr('href')) === null || _a === void 0 ? void 0 : _a.startsWith('/')) ? eventLink.attr('href') : '');
            try {
                yield page.goto(eventUrl, { waitUntil: 'networkidle2' });
            }
            catch (e) {
                console.log(`Timeout ao carregar o evento: ${eventUrl}`);
                continue;
            }
            yield page.waitForTimeout(2000);
            const eventPageContent = yield page.content();
            const eventPage = cheerio.load(eventPageContent);
            const eventTitleElem = eventPage('span.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6');
            if (!eventTitleElem.length) {
                yield page.goBack();
                continue;
            }
            let eventTitle = eventTitleElem.text().trim();
            eventTitle = eventTitle.replace("Log InLog In", "").trim(); // Remover "Log InLog In" do título
            if (uniqueEventTitles.has(eventTitle)) {
                yield page.goBack();
                continue;
            }
            uniqueEventTitles.add(eventTitle);
            const descriptionElem = eventPage('div.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x1vvkbs');
            const description = descriptionElem.length ? descriptionElem.text().trim() : '';
            const locationDiv = eventPage('div.x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz.x1sur9pj.xkrqix3.xzsf02u.x1s688f');
            let locationText = locationDiv.length ? locationDiv.text().trim() : '';
            // Remove "See more" if it exists
            if (locationText.toLowerCase().includes('see more')) {
                locationText = locationText.replace(/see more/i, '').trim();
            }
            const [latitude, longitude] = yield getCoordinates(locationText);
            const googleMapsUrl = latitude && longitude ? openGoogleMaps(latitude, longitude) : '';
            const locationDetails = {
                'Location': locationText,
                'Latitude': latitude,
                'Longitude': longitude,
                'GoogleMaps_URL': googleMapsUrl
            };
            const dateText = eventPage('div.x1e56ztr.x1xmf6yo').text().trim() || '';
            console.log("Date text:", dateText);
            let startTime = null;
            let endTime = null;
            if (dateText) {
                const match = dateText.match(/(\d{1,2}:\d{2}\s?[AP]M)\s?–\s?(\d{1,2}:\d{2}\s?[AP]M)/);
                if (match) {
                    [startTime, endTime] = match.slice(1);
                }
                else if (dateText.toLowerCase().includes("at")) {
                    const timeMatch = dateText.match(/(\d{1,2}:\d{2}\s?[AP]M)/);
                    if (timeMatch) {
                        startTime = timeMatch[1];
                    }
                }
            }
            if (!eventTitle || !dateText || !locationText) {
                yield page.goBack();
                continue;
            }
            const formattedDates = formatDate(dateText);
            if (!formattedDates) {
                console.log(`Ignoring event with invalid date: ${eventTitle}`);
                yield page.goBack();
                continue;
            }
            const [formattedStartDate, formattedEndDate] = formattedDates;
            const eventUUID = generateEventUUID(eventTitle, formattedStartDate, locationText);
            const eventInfo = Object.assign(Object.assign({ 'Title': eventTitle, 'Description': description, 'Date': formattedStartDate, 'StartTime': startTime, 'EndTime': endTime }, locationDetails), { 'EventUrl': eventUrl, 'ImageURL': eventPage('img.xz74otr.x1ey2m1c.x9f619.xds687c.x5yr21d.x10l6tqk.x17qophe.x13vifvy.xh8yej3').attr('src') || '', 'Organizer': eventPage('span.xt0psk2').text().trim() || '', 'Organizer_IMG': eventPage('img.xz74otr').attr('src') || '', 'UUID': eventUUID });
            allEvents.push(eventInfo);
            uniqueEventTitles.add(eventTitle);
            yield page.goBack();
        }
        yield page.close();
        return allEvents;
    });
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    const browser = yield puppeteer_1.default.launch({
        headless: false, // Mudar para false para abrir o navegador em modo visível
        // Remover o caminho para usar o navegador padrão do sistema
    });
    const sources = [
        {
            name: 'Eventbrite',
            url: 'https://www.eventbrite.com/d/canada--montreal/all-events/',
            scraper: scrapeEventbriteEvents,
            maxPages: 3
        },
        {
            name: 'Facebook',
            url: 'https://www.facebook.com/events/explore/montreal-quebec/102184499823699/',
            scraper: scrapeFacebookEvents,
            maxScroll: 50
        }
    ];
    const allEvents = [];
    for (const source of sources) {
        console.log(`Scraping events from: ${source.name}`);
        const events = yield source.scraper(browser, source.url, source.maxPages || source.maxScroll);
        if (events) {
            allEvents.push(...events);
        }
        else {
            console.log("No events found.");
        }
    }
    fs_1.default.writeFileSync('events.json', JSON.stringify(allEvents, null, 4));
    yield browser.close();
}))();

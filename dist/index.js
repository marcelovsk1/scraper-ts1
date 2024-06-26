"use strict";
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
const cheerio_1 = __importDefault(require("cheerio"));
const moment_1 = __importDefault(require("moment"));
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const NAMESPACE = '123e4567-e89b-12d3-a456-426614174000'; // UUID válida
const OPENCAGE_API_KEY = 'b7dae4a8c2e34bfdb672ac687f542cc0'; // Sua chave de API do OpenCage
// Função auxiliar para simular uma espera
function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}
// Função para gerar UUID para eventos
function generateEventUUID(title, date, location) {
    const name = `${title}_${date}_${location}`;
    return (0, uuid_1.v5)(name, NAMESPACE);
}
// Função para rolar a página até o fim
function scrollToBottom(page_1) {
    return __awaiter(this, arguments, void 0, function* (page, maxClicks = 15) {
        for (let i = 0; i < maxClicks; i++) {
            yield page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            yield delay(1000);
        }
    });
}
// Função para formatar datas
function formatDate(dateStr, source) {
    if (!dateStr) {
        console.log("Data recebida é None");
        return null;
    }
    const dateStrLower = dateStr.toLowerCase();
    const sourceLower = source.toLowerCase();
    if (sourceLower === 'eventbrite') {
        const patterns = [
            /(\w{3})\s*(\d{1,2})\s*·/,
            /(?:débute le\s+)?(\w{3})[.,]\s*(\d{1,2})\s*(\w{3,})\s*(\d{4})/,
            /Débute le \w{3}\., (\d{1,2}) (\w{3}) (\d{4})/,
            /(\w+), (\w+) (\d{1,2})/,
            /(\w+) (\d{1,2})/,
            /\w+, (\d{1,2}) (\w{3}) \d{4}/,
            /Débute le \w{3}\., (\d{1,2}) (\w{3}) (\d{4})/,
            /Débute le \w{3}\., (\d{1,2}) (\w{3}) (\d{4})/,
            /(?:\w{3,9}, )?(\w+) (\d{1,2})/,
            /(\w{3}), (\w{3}) (\d{1,2}), (\d{4})/,
            /(\w{3}), (\w{3}) (\d{1,2}), (\d{4}) \d{1,2}:\d{2} [AP]M/,
            /(\w{3})\s*(\d{1,2}), (\d{4})/,
            /(\w{3})[.,]\s*(\d{1,2})\s*(\w{3})\s*(\d{4})\s*(\d{2}:\d{2})/,
            /(\w{3})[.,]\s*(\d{1,2})\s*(\w{3})\s*(\d{4})/
        ];
        for (const pattern of patterns) {
            const dateMatch = dateStr.match(pattern);
            if (dateMatch) {
                try {
                    let day, month, year;
                    if (dateMatch.length === 2) {
                        [, month, day] = dateMatch;
                        year = new Date().getFullYear();
                    }
                    else if (dateMatch.length === 3) {
                        [, , month, day, year] = dateMatch;
                    }
                    else {
                        [, day, month, year] = dateMatch;
                    }
                    const monthMap = {
                        jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec',
                        janv: 'Jan', févr: 'Feb', mars: 'Mar', avr: 'Apr', mai: 'May', juin: 'Jun', juil: 'Jul', août: 'Aug', sept: 'Sep', oct: 'Oct', nov: 'Nov', déc: 'Dec',
                        ene: 'Jan', feb: 'Feb', mar: 'Mar', abr: 'Apr', mayo: 'May', jun: 'Jun', jul: 'Jul', ago: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dic: 'Dec'
                    };
                    month = monthMap[month.slice(0, 3).toLowerCase()];
                    const dateStrFormatted = `${day} ${month} ${year}`;
                    const startDate = (0, moment_1.default)(dateStrFormatted, 'DD MMM YYYY');
                    return startDate.format('DD/MM/YYYY');
                }
                catch (e) {
                    console.log(`Erro ao converter a data: ${e}`);
                    continue;
                }
            }
        }
        console.log("Nenhuma correspondência encontrada na string de data");
        return null;
    }
    else {
        console.log("Fonte não suportada");
        return null;
    }
}
// Função para obter coordenadas de localização
function getCoordinates(location) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!location) {
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
        let [latitude, longitude] = yield geocodeLocation(location + ", Montreal, Quebec, Canada");
        if (!latitude && !longitude) {
            const streetAddress = location.split(',')[0];
            [latitude, longitude] = yield geocodeLocation(streetAddress + ", Montreal, Quebec, Canada");
        }
        return [latitude, longitude];
    });
}
// Função para abrir o Google Maps com coordenadas
function openGoogleMaps(latitude, longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
// Função para raspar eventos do Eventbrite
function scrapeEventbriteEvents(browser_1, url_1) {
    return __awaiter(this, arguments, void 0, function* (browser, url, maxPages = 3) {
        const page = yield browser.newPage();
        yield page.goto(url, { waitUntil: 'networkidle2' });
        yield page.setViewport({ width: 1280, height: 800 });
        const allEvents = [];
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            console.log(`Scraping Eventbrite page ${pageNum}`);
            yield delay(2000);
            const pageContent = yield page.content();
            const $ = cheerio_1.default.load(pageContent);
            const events = $('a.eds-event-card-content__action-link');
            console.log(`Found ${events.length} events on page ${pageNum}`);
            for (const event of events.toArray()) {
                const eventLink = $(event).attr('href');
                if (!eventLink) {
                    console.log("No event link found, skipping...");
                    continue;
                }
                const eventUrl = 'https://www.eventbrite.com' + eventLink;
                console.log(`Navigating to event: ${eventUrl}`);
                try {
                    yield page.goto(eventUrl, { waitUntil: 'networkidle2' });
                    yield delay(2000);
                    const eventPageContent = yield page.content();
                    const eventPage = cheerio_1.default.load(eventPageContent);
                    const eventTitleElem = eventPage('h1.event-title.css-0');
                    if (!eventTitleElem.length) {
                        console.log("Event title not found, going back...");
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
                        console.log("Missing title, date, or location, going back...");
                        yield page.goBack();
                        continue;
                    }
                    const formattedDates = formatDate(dateText, 'Eventbrite');
                    if (!formattedDates) {
                        console.log(`Ignoring event with invalid date: ${eventTitle}`);
                        yield page.goBack();
                        continue;
                    }
                    const eventUUID = generateEventUUID(eventTitle, formattedDates, locationText);
                    const priceElem = eventPage('div.conversion-bar__panel-info');
                    const price = priceElem.length ? priceElem.text().trim() : 'undisclosed price';
                    const imageElem = eventPage('img.event-card-image');
                    const imageURL = imageElem.attr('src') || '';
                    const organizerElem = eventPage('div.descriptive-organizer-info-mobile__name');
                    const organizer = organizerElem.length ? organizerElem.text().trim() : '';
                    const eventInfo = Object.assign(Object.assign({ 'Title': eventTitle, 'Description': description, 'Date': formattedDates, 'StartTime': startTime, 'EndTime': endTime }, locationDetails), { 'EventUrl': eventUrl, 'ImageURL': imageURL, 'Organizer': organizer, 'UUID': eventUUID });
                    allEvents.push(eventInfo);
                    yield page.goBack();
                    yield delay(2000);
                }
                catch (e) {
                    console.log(`Timeout ao carregar o evento: ${eventUrl}`);
                    continue;
                }
            }
            const nextButton = yield page.$('button[data-spec="page-next"]');
            if (nextButton) {
                console.log("Clicking next button...");
                yield nextButton.click();
                yield delay(3000);
            }
            else {
                console.log("Next button not found, ending scrape.");
                break;
            }
        }
        yield page.close();
        return allEvents;
    });
}
// Função principal para executar o raspador
(() => __awaiter(void 0, void 0, void 0, function* () {
    const browser = yield puppeteer_1.default.launch({
        headless: false,
    });
    const sources = [
        {
            name: 'Eventbrite',
            url: 'https://www.eventbrite.com/d/canada--montreal/all-events/',
            scraper: scrapeEventbriteEvents,
            maxPages: 3
        }
    ];
    const allEvents = [];
    for (const source of sources) {
        console.log(`Scraping events from: ${source.name}`);
        const events = yield source.scraper(browser, source.url, source.maxPages);
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

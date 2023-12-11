import React, { useState, useEffect } from 'react';
import Pages from '../components/Pages';
import quranData from '../assets/structured_quran.json';
import Jump from '../components/Jump';
import '../assets/Book.css';

const Book = ({ bookContent }) => {
    const [currentPage, setCurrentPage] = useState(parseInt(localStorage.getItem("qurantft-pn")) ? parseInt(localStorage.getItem("qurantft-pn")) : 13);
    const [pageHistory, setPageHistory] = useState([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedSura, setSelectedSura] = useState(null);
    const [selectedVerse, setSelectedVerse] = useState(null);

    const handleJump = async (page, suraNumber, verseNumber) => {
        updatePage(parseInt(page), suraNumber, verseNumber);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const updatePage = (newPage, sura, verse) => {
        // Add currentPage to history only if it's different from the newPage
        if (currentPage !== newPage) {
            setPageHistory(prevHistory => [...prevHistory, currentPage]);
        }
        setSelectedSura(sura);
        setSelectedVerse(verse);
        setCurrentPage(newPage);
    };


    useEffect(() => {
        if (currentPage) {
            localStorage.setItem("qurantft-pn", currentPage)
        }
    }, [currentPage]);


    const nextPage = () => {
        updatePage(currentPage + 1);
    };

    const prevPage = () => {
        if (pageHistory.length > 0) {
            // Get the last page from history and remove it from the history array
            const lastPage = pageHistory[pageHistory.length - 1];
            setPageHistory(prevHistory => prevHistory.slice(0, -1));
            setCurrentPage(lastPage);
        } else {
            // If history is empty and the current page is not 13, decrement the page
            if (currentPage !== 13) {
                setCurrentPage(prevPage => prevPage > 1 ? prevPage - 1 : 1);
            }
        }
    };


    const createReferenceMap = () => {
        const referenceMap = {};

        Object.entries(quranData).forEach(([pageNumber, value]) => {
            // Ensure that pageValues is an array
            const pageValues = Array.isArray(value.page) ? value.page : [value.page];
            const suraVersePattern = /\d+:\d+-\d+/g;
            let matches = [];

            pageValues.forEach(pageValue => {
                const match = pageValue.match(suraVersePattern);
                if (match) {
                    matches = matches.concat(match);
                }
            });

            referenceMap[pageNumber] = matches;
        });

        return referenceMap;
    };

    const referenceMap = createReferenceMap();

    const handleClickReference = (reference) => {
        console.log("Reference clicked:", reference);

        // Parse the reference to extract sura and verse information
        let [sura, verses] = reference.split(':');
        let verseStart, verseEnd;
        if (verses.includes('-')) {
            [verseStart, verseEnd] = verses.split('-').map(Number);
        } else {
            verseStart = verseEnd = parseInt(verses);
        }

        // Iterate over the referenceMap to find the correct page number
        let foundPageNumber = null;
        Object.entries(referenceMap).forEach(([pageNumber, suraVersesArray]) => {
            suraVersesArray.forEach(suraVerses => {
                let [suraMap, verseRange] = suraVerses.split(':');
                let [verseStartMap, verseEndMap] = verseRange.split('-').map(Number);

                if (suraMap === sura && verseStart >= verseStartMap && verseEnd <= verseEndMap) {
                    foundPageNumber = pageNumber;
                }
            });
        });

        if (foundPageNumber) {
            console.log("Page number:", foundPageNumber);
            updatePage(foundPageNumber, sura, verseStart);
        } else {
            console.log("Reference not found in the book.");
        }
    };



    const renderBookContent = () => {
        // Render Pages component when current page is 23 or more
        if (currentPage >= 23) {
            return <Pages selectedPage={currentPage} selectedSura={selectedSura} selectedVerse={selectedVerse} />;
        }

        if (currentPage == 22) {
            return (
            <div className="w-screen h-screen flex items-center justify-center text-neutral-300">
                Sura List Loading...
            </div>);
        }
        const combinedContent = [];
        const currentPageData = bookContent.find(page => page.page === currentPage);

        if (currentPageData.titles) { // Render normal book content for other pages
            if (!currentPageData) {
                return <div className="text-neutral-200/80 flex flex-1 items-center justify-center w-full ">Loading...</div>;
            }

            // Add titles to combined content
            Object.entries(currentPageData.titles).forEach(([key, value]) => {
                combinedContent.push({ type: 'title', content: value, order: parseInt(key) });
            });

            // Add text paragraphs to combined content
            Object.entries(currentPageData.text).forEach(([key, value]) => {
                combinedContent.push({ type: 'text', content: value, order: parseInt(key) });
            });

            // Add evidence to combined content
            Object.entries(currentPageData.evidence).forEach(([key, value]) => {
                combinedContent.push({ type: 'evidence', content: value, order: parseInt(key) });
            });
        }
        // Sort the combined content by order
        combinedContent.sort((a, b) => a.order - b.order);

        const parseReferences = (text) => {
            const referenceRegex = /(\d+:\d+(?:-\d+)?)/g;
            return text.split(referenceRegex).map((part, index) => {
                if (part.match(referenceRegex)) {
                    return (
                        <span
                            key={index}
                            className="cursor-pointer text-sky-300"
                            onClick={() => handleClickReference(part)}
                        >
                            {part}
                        </span>
                    );
                }
                return part;
            });
        };

        // Render combined content
        const renderContent = combinedContent.map((item, index) => {
            if (item.type === 'title') {
                return (
                    <div className={`w-full my-3 flex items-center justify-center text-center font-bold text-neutral-100  whitespace-pre-line ${item.order === 0 ? "text-2xl" : "itelic text-base"}`}>
                        <h2 key={`title-${index}`}>{item.content}</h2>
                    </div>
                );
            } else if (item.type === 'text') {
                return <p key={`text-${index}`} className="mb-4 indent-4">{parseReferences(item.content)}</p>;
            } else if (item.type === 'evidence') {
                return (
                    <div key={`evidence-${index}`} className={`bg-sky-700 rounded text-sm md:text-base p-3 my-3 border-2 border-neutral-400`}>
                        {Object.entries(item.content.lines).map(([lineKey, lineValue]) => (
                            <p className="my-1" key={lineKey}>{lineValue}</p>
                        ))}
                        <p>[ {item.content.ref.join(', ')} ]</p>
                    </div>
                );
            }
        });

        return (
            <div className="text-neutral-200 overflow-auto flex-1 p-3 text-justify lg:text-start text-lg md:text-xl">
                {renderContent}
            </div>
        );
    };

    return (
        <div className="flex flex-col justify-start h-screen bg-sky-800">
            {renderBookContent()}
            <div className="w-full flex z-20">
                <div className="flex w-full items-center justify-between p-2">
                    <button onClick={prevPage}
                        className="w-28 text-neutral-300 px-2 py-1 rounded mr-2 flex justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                        </svg>
                    </button>
                    <div
                        onClick={() => setModalOpen(!isModalOpen)}
                        className="">
                        <h2 className="text-sm font-bold text-neutral-200/50 p-2">Page {currentPage}</h2>
                    </div>
                    <button onClick={nextPage}
                        className="w-28 text-neutral-300 px-2 py-1 rounded ml-2 flex justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                        </svg>
                    </button>
                </div>
            </div>
            {isModalOpen &&
                <Jump
                    currentPage={currentPage}
                    quran={quranData}
                    onClose={handleCloseModal}
                    onConfirm={handleJump}
                />
            }
        </div>
    );
};

export default Book;
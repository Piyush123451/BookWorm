const API_BASE_URL = "https://openlibrary.org/search.json";

async function searchBooks(query, page = 1) {
    const params = new URLSearchParams({
        q: query,
        fields: "key,title,author_name,first_publish_year,cover_i",
        limit: "20",
        page: String(page)
    });

    const response = await fetch(`${API_BASE_URL}?${params}`);
    if (!response.ok) throw new Error("Unable to fetch books.");

    const data = await response.json();
    return { docs: data.docs, total: data.numFound };
}
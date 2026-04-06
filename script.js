pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let extractedText = "";
let currentRole = "student";

// 1. ROLE & THEME
function setRole(role) {
    currentRole = role;
    document.getElementById('role-student').classList.toggle('active', role === 'student');
    document.getElementById('role-teacher').classList.toggle('active', role === 'teacher');
}

function toggleDarkMode() {
    const current = document.body.getAttribute('data-theme');
    document.body.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
}

// 2. PDF SCRAPER & CLEANER
async function handleFileUpload() {
    const file = document.getElementById('pdf-upload').files;
    if (!file) return alert("Select a PDF!");
    
    document.getElementById('loader').style.display = 'flex';
    const reader = new FileReader();
    
    reader.onload = async function() {
        try {
            const typedarray = new Uint8Array(this.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let rawText = "";

            for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                rawText += content.items.map(s => s.str).join(" ") + " ";
            }

            // CLEANER ENGINE: Removes Page Headers/Footers and Noise
            extractedText = rawText
                .replace(/K to 12 BASIC EDUCATION.*?Page \d+ of \d+/gi, "")
                .replace(/SENIOR HIGH SCHOOL – APPLIED TRACK SUBJECT/gi, "")
                .replace(/\s+/g, ' ')
                .trim();

            document.getElementById('loader').style.display = 'none';
            showAnalysis();
        } catch (e) {
            alert("Error reading PDF.");
            document.getElementById('loader').style.display = 'none';
        }
    };
    reader.readAsArrayBuffer(file);
}

// 3. ANALYSIS DASHBOARD
function showAnalysis() {
    document.getElementById('bridge-modal').style.display = 'block';
    const gradeSelect = document.getElementById('grade-level').value;
    
    // Detect Level Mismatch (SHS Content in JHS Mode)
    const isSHSContent = /Senior High|SHS|Applied Track|Empowerment/i.test(extractedText);
    const mismatch = (gradeSelect === 'jhs' && isSHSContent);

    // Update Dashboard Stats
    document.getElementById('stat-subject').innerText = extractedText.includes("Empowerment") ? "Empowerment Tech" : "General Subject";
    document.getElementById('stat-level').innerText = gradeSelect.toUpperCase();
    document.getElementById('stat-mismatch').style.display = mismatch ? 'block' : 'none';

    // Update Full Text Preview
    document.getElementById('analysis-text').innerText = extractedText;

    // Show correct tools
    document.getElementById('teacher-tools').style.display = (currentRole === 'teacher') ? 'block' : 'none';
    document.getElementById('student-tools').style.display = (currentRole === 'student') ? 'block' : 'none';
    document.getElementById('result-area').style.display = 'none';
}

// 4. PRECISION GENERATION
function generate(type) {
    const container = document.getElementById('result-container');
    const resultArea = document.getElementById('result-area');
    resultArea.style.display = 'block';

    if (type === 'dll') {
        // Scraper identifies Content Standard between standard headers
        const contentStd = extractedText.match(/(?:demonstrate an understanding of|content standards?):?\s*(.*?)(?=the learners shall|performance standard|$)/i)?. || "Review Curriculum Guide Matrix";
        const perfStd = extractedText.match(/(?:shall be able to|performance standards?):?\s*(.*?)(?=the learners:|learning competencies|$)/i)?. || "Review Curriculum Guide Matrix";
        
        container.innerHTML = `
            <table style="width:100%;">
                <tr style="background:#f2f2f2;"><th colspan="2">DAILY LESSON LOG (DO 42, s. 2016)</th></tr>
                <tr><td style="width:30%; font-weight:bold;">Content Standard</td><td>${contentStd.trim()}</td></tr>
                <tr><td style="font-weight:bold;">Performance Standard</td><td>${perfStd.trim()}</td></tr>
                <tr style="background:#f9fafb;"><td colspan="2"><b>Activity Proper:</b> Review and discuss concepts found in: <i>${extractedText.substring(0, 80)}...</i></td></tr>
            </table>`;
    } else {
        container.innerHTML = `<h4>Assessment</h4><p>1. Explain the significance of the following extracted concept: <b>${extractedText.substring(0, 40)}...</b></p>`;
    }
    resultArea.scrollIntoView({ behavior: 'smooth' });
}

// 5. EXPORT & UTILITIES
function exportToWord() {
    const { Document, Packer, Paragraph, TextRun } = window.docx;
    const content = document.getElementById('result-container').innerText;

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ children: [new TextRun({ text: "BridgeLearn Export", bold: true, size: 32 })] }),
                new Paragraph({ text: content })
            ]
        }]
    });
    window.docx.Packer.toBlob(doc).then(blob => window.saveAs(blob, "BridgeLearn_Lesson_Log.docx"));
}

function updateFileName() { 
    const input = document.getElementById('pdf-upload');
    document.getElementById('file-name').innerText = "📄 " + (input.files.name || "File Selected"); 
}

function closeBridge() { document.getElementById('bridge-modal').style.display = 'none'; }
window.onload = () => setTimeout(() => document.getElementById('loader').style.display = 'none', 1000);

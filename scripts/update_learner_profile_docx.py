import copy
import docx
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

DOC_PATH = r"C:\Users\user\Downloads\CCS Computer Science 26-27 course outline.docx"

def make_run(text, bold=False, italic=False, font_name="Arial", font_size_pt=9.5):
    r = OxmlElement("w:r")
    rPr = OxmlElement("w:rPr")
    rf = OxmlElement("w:rFonts")
    rf.set(qn("w:ascii"), font_name)
    rf.set(qn("w:hAnsi"), font_name)
    rPr.append(rf)
    sz = OxmlElement("w:sz")
    sz.set(qn("w:val"), str(int(font_size_pt * 2)))
    rPr.append(sz)
    if bold:
        b = OxmlElement("w:b")
        rPr.append(b)
    if italic:
        i = OxmlElement("w:i")
        rPr.append(i)
    r.append(rPr)
    t = OxmlElement("w:t")
    t.text = text
    t.set(qn("xml:space"), "preserve")
    r.append(t)
    return r

def set_tc_topic(tc, text, bold=True, font_name="Arial", font_size_pt=9.5):
    for p in tc.findall(qn("w:p")):
        tc.remove(p)
    p = OxmlElement("w:p")
    pPr = OxmlElement("w:pPr")
    sp = OxmlElement("w:spacing")
    sp.set(qn("w:before"), "60")
    sp.set(qn("w:after"), "60")
    sp.set(qn("w:line"), "240")
    sp.set(qn("w:lineRule"), "auto")
    pPr.append(sp)
    p.append(pPr)

    if text:
        r = make_run(text, bold=bold, font_name=font_name, font_size_pt=font_size_pt)
        p.append(r)
    tc.append(p)

def set_tc_learner_profile(tc, items, font_name="Arial", font_size_pt=9.5):
    for p in tc.findall(qn("w:p")):
        tc.remove(p)

    for idx, (attr, desc) in enumerate(items):
        p = OxmlElement("w:p")
        pPr = OxmlElement("w:pPr")
        sp = OxmlElement("w:spacing")
        sp.set(qn("w:before"), "40" if idx > 0 else "40")
        sp.set(qn("w:after"), "60" if idx == len(items) - 1 else "40")
        sp.set(qn("w:line"), "240")
        sp.set(qn("w:lineRule"), "auto")
        pPr.append(sp)
        p.append(pPr)

        # Bold attribute label
        r_attr = make_run(f"{attr}: ", bold=True, font_name=font_name, font_size_pt=font_size_pt)
        p.append(r_attr)

        # Regular description
        r_desc = make_run(desc, bold=False, font_name=font_name, font_size_pt=font_size_pt)
        p.append(r_desc)

        tc.append(p)

def update_table_7():
    doc = docx.Document(DOC_PATH)
    t7 = doc.tables[7]
    tbl = t7._tbl

    # All curriculum topics mapped to IB Learner Profile attributes directly based on IB Computer Science Guide (pp. 15-16, 23-24)
    topics_lp = [
        (
            "1. System Fundamentals",
            [
                ("Knowledgeable", "Build conceptual understanding of hardware, software, data, networks, and computer systems in organizations."),
                ("Caring", "Consider the needs, privacy, and accessibility of diverse stakeholders and end-users when evaluating usability and system design."),
                ("Principled", "Address social and ethical implications, data security, and copyright issues during data migration and system deployment.")
            ]
        ),
        (
            "2. Computer Organization",
            [
                ("Thinkers", "Analyze CPU architecture, the machine instruction cycle, and apply logical reasoning to construct Boolean logic diagrams and truth tables."),
                ("Knowledgeable", "Understand internal data representations (binary, hexadecimal, Unicode) and the core functions of operating systems and memory hierarchies.")
            ]
        ),
        (
            "3. Networks",
            [
                ("Communicators", "Understand how international standards and communication protocols (OSI model, TCP/IP) enable reliable global data exchange."),
                ("Principled", "Demonstrate awareness of ethical responsibilities regarding network security, data confidentiality, encryption, and protection against unauthorized access."),
                ("Open-minded", "Appreciate how network technologies and the internet transcend geographical boundaries to foster global interconnectivity and international-mindedness.")
            ]
        ),
        (
            "4. Computational Thinking, Problem-Solving and Programming",
            [
                ("Thinkers", "Decompose complex problems into manageable sub-problems; exercise procedural, logical, abstract, and concurrent thinking to design efficient algorithms using pseudocode and flowcharts."),
                ("Inquirers", "Independently investigate and experiment with control structures, arrays, and standard searching and sorting algorithms in working code."),
                ("Reflective", "Systematically trace algorithms using trace tables, evaluate algorithm efficiency, and debug programs through iterative testing.")
            ]
        ),
        (
            "5. Abstract Data Structures (HL Extension)",
            [
                ("Thinkers", "Master recursive thinking to solve complex algorithmic challenges; logically model and visualize dynamic data structures including stacks, queues, linked lists, and binary trees."),
                ("Inquirers", "Investigate the operational differences between static and dynamic data structures, analyzing their performance in various real-world scenarios.")
            ]
        ),
        (
            "6. Resource Management (HL Extension)",
            [
                ("Knowledgeable", "Acquire deep technical understanding of operating system resource management, including processor scheduling, virtual memory, paging, and interrupts."),
                ("Balanced", "Evaluate system trade-offs between hardware limitations and software demands to achieve optimal, balanced performance in multi-user and multi-access environments.")
            ]
        ),
        (
            "7. Control (HL Extension)",
            [
                ("Inquirers", "Explore the operation of centralized and distributed control systems, analyzing interactions between microprocessors, sensors, actuators, and feedback loops."),
                ("Principled", "Critically evaluate the ethical, social, and moral implications of embedded control systems and autonomous agents, such as automated surveillance and biometric monitoring.")
            ]
        ),
        (
            "Option D: Object-Oriented Programming (OOP)",
            [
                ("Thinkers", "Apply object-oriented principles (encapsulation, inheritance, polymorphism, and abstraction) to architect modular, reusable software designs."),
                ("Principled", "Uphold professional programming ethics, adhere to standard coding style and naming conventions, test rigorously to prevent commercial damage, and acknowledge open-source contributions."),
                ("Inquirers", "Explore and utilize standard library collections (such as ArrayList and LinkedList in the JETS subset) to implement robust data structures.")
            ]
        ),
        (
            "Case Study (HL Extension)",
            [
                ("Inquirers & Thinkers", "Conduct comprehensive independent research into the annually issued IB scenario, investigating cutting-edge technological concepts and formulating strategic technical plans."),
                ("Risk-takers", "Confidently explore unfamiliar, rapidly evolving technologies and propose innovative, well-justified solutions to complex real-world dilemmas."),
                ("Reflective", "Critically reflect upon the economic, social, and ethical consequences of proposed strategic technical decisions.")
            ]
        ),
        (
            "Internal Assessment (IA): Solution",
            [
                ("Communicators & Caring", "Collaborate constructively with an identified real-world client and adviser, actively listening to user requirements and negotiating realistic success criteria."),
                ("Principled", "Adhere strictly to academic integrity, ensure authenticity of code, maintain the security and confidentiality of client data, and conduct rigorous, unbiased product testing."),
                ("Reflective", "Evaluate the completed product against initial success criteria based on client feedback, critically reflecting on personal methodologies and proposing realistic future improvements.")
            ]
        ),
        (
            "Group 4 Project",
            [
                ("Communicators", "Collaborate effectively in mixed-subject science teams (combining Computer Science with Biology, Chemistry, and Physics), sharing technical concepts clearly and presenting unified outcomes."),
                ("Open-minded", "Value and integrate diverse scientific perspectives and methodologies to address interdisciplinary real-world problems.")
            ]
        )
    ]

    trs = tbl.findall(qn("w:tr"))
    tr_template = copy.deepcopy(trs[1])

    # Remove existing data rows from row 1 onwards
    while len(tbl.findall(qn("w:tr"))) > 1:
        tbl.remove(tbl.findall(qn("w:tr"))[1])

    # Add updated rows for all topics
    for topic_title, lp_items in topics_lp:
        new_tr = copy.deepcopy(tr_template)
        tcs = new_tr.findall(qn("w:tc"))
        set_tc_topic(tcs[0], topic_title, bold=True)
        set_tc_learner_profile(tcs[1], lp_items)
        tbl.append(new_tr)

    doc.save(DOC_PATH)
    print(f"Successfully updated Table 7 in {DOC_PATH}! Total rows in Table 7: {len(tbl.findall(qn('w:tr')))}")

if __name__ == "__main__":
    update_table_7()

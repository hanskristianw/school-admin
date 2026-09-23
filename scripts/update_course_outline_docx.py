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

def set_tc_text(tc, text, bold=False, font_name="Arial", font_size_pt=9.0):
    for p in tc.findall(qn("w:p")):
        tc.remove(p)
    p = OxmlElement("w:p")
    pPr = OxmlElement("w:pPr")
    sp = OxmlElement("w:spacing")
    sp.set(qn("w:before"), "20")
    sp.set(qn("w:after"), "20")
    sp.set(qn("w:line"), "240")
    sp.set(qn("w:lineRule"), "auto")
    pPr.append(sp)
    p.append(pPr)

    if text:
        r = make_run(text, bold=bold, font_name=font_name, font_size_pt=font_size_pt)
        p.append(r)
    tc.append(p)

def set_topic_tc(tc, topic_title, page_ref="", font_name="Arial", font_size_pt=9.5):
    for p in tc.findall(qn("w:p")):
        tc.remove(p)
    p = OxmlElement("w:p")
    pPr = OxmlElement("w:pPr")
    sp = OxmlElement("w:spacing")
    sp.set(qn("w:before"), "20")
    sp.set(qn("w:after"), "20")
    sp.set(qn("w:line"), "240")
    sp.set(qn("w:lineRule"), "auto")
    pPr.append(sp)
    p.append(pPr)

    # Bold title
    r1 = make_run(topic_title, bold=True, font_name=font_name, font_size_pt=font_size_pt)
    p.append(r1)

    # Regular page ref
    if page_ref:
        r2 = make_run(" " + page_ref, bold=False, italic=True, font_name=font_name, font_size_pt=font_size_pt)
        p.append(r2)

    tc.append(p)

def set_alloc_tc(tc, sl_classes, hl_classes, font_name="Arial", font_size_pt=9.0):
    for p in tc.findall(qn("w:p")):
        tc.remove(p)

    # Paragraph 1: SL
    p1 = OxmlElement("w:p")
    pPr1 = OxmlElement("w:pPr")
    sp1 = OxmlElement("w:spacing")
    sp1.set(qn("w:before"), "0")
    sp1.set(qn("w:after"), "0")
    sp1.set(qn("w:line"), "220")
    sp1.set(qn("w:lineRule"), "auto")
    pPr1.append(sp1)
    p1.append(pPr1)

    p1.append(make_run("SL: ", bold=True, font_name=font_name, font_size_pt=font_size_pt))
    if sl_classes > 0:
        cls_str = f"{sl_classes} {'Class' if sl_classes == 1 else 'Classes'} ({sl_classes * 45} Min)"
        p1.append(make_run(cls_str, bold=False, font_name=font_name, font_size_pt=font_size_pt))
    else:
        p1.append(make_run("---", bold=False, font_name=font_name, font_size_pt=font_size_pt))
    tc.append(p1)

    # Paragraph 2: HL
    p2 = OxmlElement("w:p")
    pPr2 = OxmlElement("w:pPr")
    sp2 = OxmlElement("w:spacing")
    sp2.set(qn("w:before"), "0")
    sp2.set(qn("w:after"), "0")
    sp2.set(qn("w:line"), "220")
    sp2.set(qn("w:lineRule"), "auto")
    pPr2.append(sp2)
    p2.append(pPr2)

    p2.append(make_run("HL: ", bold=True, font_name=font_name, font_size_pt=font_size_pt))
    cls_str_hl = f"{hl_classes} {'Class' if hl_classes == 1 else 'Classes'} ({hl_classes * 45} Min)"
    if sl_classes == 0:
        cls_str_hl += " [HL Ext]"
    p2.append(make_run(cls_str_hl, bold=(sl_classes == 0), font_name=font_name, font_size_pt=font_size_pt))
    tc.append(p2)

def set_vmerge(tc, val=None):
    tcPr = tc.get_or_add_tcPr()
    vm = tcPr.find(qn("w:vMerge"))
    if vm is None:
        vm = OxmlElement("w:vMerge")
        tcPr.append(vm)
    if val:
        vm.set(qn("w:val"), val)
    else:
        if qn("w:val") in vm.attrib:
            del vm.attrib[qn("w:val")]

def remove_vmerge(tc):
    tcPr = tc.get_or_add_tcPr()
    vm = tcPr.find(qn("w:vMerge"))
    if vm is not None:
        tcPr.remove(vm)

def update_document():
    doc = docx.Document(DOC_PATH)
    t1 = doc.tables[1]
    tbl = t1._tbl

    # --- 1. Update Header Row 4: Set HL classes per week to 6 (Option A) ---
    tr4 = tbl.xpath("./w:tr")[4]
    p_runs = tr4.xpath("./w:tc")[4].xpath("./w:p")
    if len(p_runs) > 3:
        for r in p_runs[3].xpath("./w:r/w:t"):
            if r.text.strip() == "5":
                r.text = "6"
                print("Updated Table 1 header: HL classes per week set to 6.")

    # --- 2. Fully Detailed Curriculum with Granular IA & Case Study Breakdowns ---
    curriculum = [
        # ==========================================
        #                 YEAR 1
        # ==========================================
        # --- Core Topic 1: System Fundamentals (SL: 27, HL: 27) ---
        {
            "year": "Year 1",
            "topic_title": "Topic 1: System Fundamentals",
            "page_ref": "(hal. 11, 18–22)",
            "items": [
                ("1.1.1 - 1.1.3 Planning and change management: context of new system, organizational issues, need for change management, and compatibility issues (legacy systems, mergers)", 2, 2),
                ("1.1.4 - 1.1.5 System implementation & installation: SaaS remote hosting vs client hardware, and alternative installation processes (parallel, pilot, direct changeover, phased conversion)", 2, 2),
                ("1.1.6 - 1.1.7 Data migration & system testing: migration problems (incompatible formats, validation rules, character sets) and testing strategies (user acceptance, debugging, beta, automated testing)", 1, 1),
                ("1.1.8 - 1.1.10 User focus: importance and methods of user documentation (help files, online support, manuals) and user training methods (self-instruction, formal classes, remote training)", 3, 3),
                ("1.1.11 - 1.1.13 System backup: causes and consequences of data loss, and prevention methods (failover systems, redundancy, removable media, offsite/online storage)", 3, 3),
                ("1.1.14 Software deployment: strategies for managing releases and updates (patches, automatic updates)", 2, 2),
                ("1.2.1 - 1.2.3 Components of a computer system: hardware, software, peripherals, network, human resources, roles of computers (server, router, firewall), and networked world ethics", 3, 3),
                ("1.2.4 - 1.2.6 Stakeholder requirements: identifying stakeholders, methods of obtaining requirements (surveys, interviews, observations), and information gathering techniques", 2, 2),
                ("1.2.7 - 1.2.9 System modeling & design cycle: representations (flow charts, DFDs, structure charts), prototyping purpose, and iterative design cycle", 3, 3),
                ("1.2.10 - 1.2.11 End-user involvement & social impact: consequences of failing to involve end-users and social/ethical issues of introducing new IT systems", 2, 2),
                ("1.2.12 - 1.2.16 Human interaction with the system: usability definitions (ergonomics/accessibility), usability problems in devices/systems, accessibility improvement methods, and human-machine implications", 4, 4),
            ]
        },
        # --- Core Topic 2: Computer Organization (SL: 8, HL: 8) ---
        {
            "year": "Year 1",
            "topic_title": "Topic 2: Computer organization",
            "page_ref": "(hal. 11, 22–25)",
            "items": [
                ("2.1.1 - 2.1.4 Computer architecture: CPU architecture (ALU, CU, MAR, MDR registers), primary memory (RAM vs ROM), cache memory, and machine instruction cycle (data/address bus)", 2, 2),
                ("2.1.5 Secondary memory: need for persistent storage (non-volatile storage)", 1, 1),
                ("2.1.6 - 2.1.8 Operating systems & applications: functions of an operating system (memory management), application software range, and common GUI/OS features", 1, 1),
                ("2.1.9 - 2.1.10 Binary representation: bits, bytes, binary, decimal, hexadecimal, and data representations (strings, integers, characters, colors, Unicode)", 2, 2),
                ("2.1.11 - 2.1.13 Logic gates: Boolean operators (AND, OR, NOT, NAND, NOR, XOR), truth tables, and logic diagrams", 2, 2),
            ]
        },
        # --- Core Topic 4: Computational Thinking, Problem-Solving and Programming (SL: 60, HL: 60) ---
        {
            "year": "Year 1",
            "topic_title": "Topic 4: Computational thinking, problem-solving and programming",
            "page_ref": "(hal. 11, 27–34)",
            "items": [
                ("4.1.1 - 4.1.3 Thinking procedurally: procedure identification, order of activities, and role of sub-procedures", 3, 3),
                ("4.1.4 - 4.1.8 Thinking logically: decision-making, Boolean conditions (AND, OR, NOT), IF...THEN...ELSE, and deducing logical rules", 3, 3),
                ("4.1.9 - 4.1.13 Thinking ahead: inputs/outputs, pre-planning (Gantt, caching), pre/post-conditions, and exceptions", 3, 3),
                ("4.1.14 - 4.1.16 Thinking concurrently: identifying concurrent parts, concurrent processing, and evaluating concurrency", 2, 2),
                ("4.1.17 - 4.1.20 Thinking abstractly: abstraction examples, necessity of abstraction, successive decomposition, and real-world vs abstraction", 2, 2),
                ("4.2.1 - 4.2.3 Standard algorithms & collections: linear array algorithms (sequential search, binary search, bubble sort, selection sort), collection operations, and algorithm discussion", 8, 8),
                ("4.2.4 - 4.2.6 Algorithm representations: flowchart analysis, pseudocode analysis (variables, nested loops, conditionals), and constructing pseudocode", 11, 11),
                ("4.2.7 - 4.2.9 Algorithm efficiency & tracing: suggesting algorithms, deducing efficiency (loop complexity), and determining step execution/iteration counts", 10, 10),
                ("4.3.1 - 4.3.5 Programming languages nature: fundamental & compound operations, language features, higher level languages, and translation (compilers, interpreters, virtual machines)", 4, 4),
                ("4.3.6 - 4.3.9 Language constructs & control structures: variables, constants, operators, loops (for, while, do-while), and branching", 6, 6),
                ("4.3.10 - 4.3.13 Sub-programmes & data structures: collection characteristics & access methods, sub-programmes/methods modularity, and 1D arrays", 8, 8),
            ]
        },
        # --- Core Group 4 Project in Year 1 (SL: 13, HL: 13) ---
        {
            "year": "Year 1",
            "topic_title": "Group 4 Project",
            "page_ref": "(hal. 11, 86–90)",
            "items": [
                ("Group 4 Project: Interdisciplinary collaborative science project (planning 2h, action 6h, evaluation 2h)", 13, 13),
            ]
        },
        # --- Core IA Stage 1 in Year 1: Broken Down by Criterion A & B (SL: 12, HL: 12) ---
        {
            "year": "Year 1",
            "topic_title": "Internal Assessment (IA) Stage 1",
            "page_ref": "(hal. 11, 74–77)",
            "items": [
                ("IA Criterion A - Planning (hal. 74–77, 81): client identification, problem scenario analysis, rationale for proposed solution, and bulleted success criteria formulation", 5, 5),
                ("IA Criterion B - Solution overview & Record of tasks (hal. 74–77, 82): chronology of tasks, detailed design overview (flowcharts, UML diagrams, GUI layouts), and test plan design", 7, 7),
            ]
        },
        # --- HL Extension Topics in Year 1 (SL: ---, HL: 60) ---
        {
            "year": "Year 1",
            "topic_title": "Topic 5: Abstract data structures [HL Extension]",
            "page_ref": "(hal. 11, 35–37)",
            "items": [
                ("5.1.1 - 5.1.3 Thinking recursively: recursive thinking situations (fractals, Towers of Hanoi), recursion in solutions, and tracing recursive algorithms", 0, 5),
                ("5.1.4 - 5.1.5 Two-dimensional arrays: characteristics and algorithms on two-dimensional arrays", 0, 2),
                ("5.1.6 - 5.1.7, 5.1.10 Stacks & static arrays: stack characteristics (LIFO), applications, push/pop/isEmpty, and array implementation of static stacks", 0, 6),
                ("5.1.8 - 5.1.10 Queues & circular queues: queue characteristics (FIFO), applications, enqueue/dequeue/isEmpty, circular queues, and array implementation", 0, 6),
                ("5.1.11 - 5.1.13 Linked lists: dynamic data structures, nodes and pointers, logical operation, and sketching single/double/circular linked lists (insert, delete, search)", 0, 5),
                ("5.1.14 - 5.1.17 Binary trees: tree logical operation, root, parent, left/right child, subtree, leaf, tree traversals (preorder, inorder, postorder), and sketching binary trees", 0, 4),
                ("5.1.18 - 5.1.20 Applications: static vs dynamic data structures comparison, and suitability for specified problems", 0, 3),
            ]
        },
        {
            "year": "Year 1",
            "topic_title": "Topic 6: Resource management [HL Extension]",
            "page_ref": "(hal. 11, 38–39)",
            "items": [
                ("6.1.1 - 6.1.4 System resources: primary memory, secondary storage, processor speed, bandwidth, resource limitations, and problems in multi-access/multiprogramming", 0, 5),
                ("6.1.5 - 6.1.9 Operating system role: memory management, peripheral management, OS resource techniques (scheduling, multitasking, virtual memory, paging, interrupt, polling), dedicated OS, and hardware virtualization", 0, 6),
            ]
        },
        {
            "year": "Year 1",
            "topic_title": "Topic 7: Control [HL Extension]",
            "page_ref": "(hal. 11, 39–40)",
            "items": [
                ("7.1.1 - 7.1.3 Centralized control systems: control systems range (automatic doors, heating, elevators, robots), microprocessors, sensors, and input devices", 0, 6),
                ("7.1.4 - 7.1.6 Transducers, feedback & ethics: sensors, processors, output transducers, role of feedback, and social/ethical impacts of embedded systems", 0, 6),
                ("7.1.7 - 7.1.8 Distributed systems & autonomous agents: centrally controlled vs distributed systems, and role of autonomous agents", 0, 6),
            ]
        },

        # ==========================================
        #                 YEAR 2
        # ==========================================
        # --- Core Topic 3 in Year 2 (SL: 12, HL: 12) ---
        {
            "year": "Year 2",
            "topic_title": "Topic 3: Networks",
            "page_ref": "(hal. 11, 25–27)",
            "items": [
                ("3.1.1 - 3.1.5 Network fundamentals: LAN, VLAN, WAN, SAN, WLAN, VPN, OSI 7-layer model awareness, and VPN evaluation", 4, 4),
                ("3.1.6 - 3.1.11 Data transmission: protocols, data packets, transmission speed factors, data compression, transmission media (metal, fiber, wireless), and packet switching", 4, 4),
                ("3.1.12 - 3.1.16 Wireless networking & security: advantages/disadvantages of wireless, components, WiFi, WiMAX, network security methods (encryption, userID, MAC), and security evaluation", 4, 4),
            ]
        },
        # --- Core Option D in Year 2 (SL: 40, HL: 40) ---
        {
            "year": "Year 2",
            "topic_title": "Option D: Object-oriented programming",
            "page_ref": "(hal. 11, 57–64)",
            "items": [
                ("D.1.1 - D.1.10 Objects as a programming concept: objects, instantiation, UML diagrams, decomposition (3–5 objects), relationships (dependency, aggregation, inheritance), data types, and parameter passing", 8, 8),
                ("D.2.1 - D.2.10 Features of OOP: encapsulation, inheritance, polymorphism, libraries, disadvantages of OOP, programming teams, and modularity", 7, 7),
                ("D.3.1 - D.3.10 Program development in Java: classes, methods, access modifiers, primitives vs String, selection & repetition control structures, static arrays, internationalization, and programmer ethics", 25, 25),
            ]
        },
        # --- HL Extension Option D.4 in Year 2 (SL: ---, HL: 20) ---
        {
            "year": "Year 2",
            "topic_title": "Option D: OOP (HL Extension D.4)",
            "page_ref": "(hal. 11, 61–64)",
            "items": [
                ("D.4.1 - D.4.6 Recursion & object references: recursion application, recursive algorithms, tracing recursion, object references, and reference mechanisms in Java", 0, 7),
                ("D.4.7 - D.4.10 Abstract Data Type (ADT) lists: static implementation of lists (add, insert, delete, isEmpty, isFull) and list algorithms using object references", 0, 6),
                ("D.4.11 - D.4.15 JETS library collections & ADTs: ArrayList and LinkedList in JETS, tracing collection algorithms, ADT stack, queue, binary tree in OOP, and code naming conventions", 0, 7),
            ]
        },
        # --- HL Extension: Case Study in Year 2: Broken Down by Instructional Phases (SL: ---, HL: 40) ---
        {
            "year": "Year 2",
            "topic_title": "Case Study [HL Extension]",
            "page_ref": "(hal. 11, 71–73)",
            "items": [
                ("Case Study Phase 1 - Scenario analysis & technical terminology (hal. 71–73): background investigation of the organization, systems context, user roles, and domain-specific vocabulary", 0, 10),
                ("Case Study Phase 2 - In-depth technical research & global context (hal. 71–73): investigating hardware/software architectures, comparison with real-world technologies, and evaluating social/ethical implications", 0, 15),
                ("Case Study Phase 3 - Strategic solutions & Paper 3 exam preparation (hal. 71–73): formulating and justifying strategic technical recommendations, structured questions analysis, and extended synthesis responses (Question 4)", 0, 15),
            ]
        },
        # --- Core IA Stage 2 in Year 2: Broken Down by Criterion C, D & E (SL: 28, HL: 28) ---
        {
            "year": "Year 2",
            "topic_title": "Internal Assessment (IA) Stage 2",
            "page_ref": "(hal. 11, 74–85)",
            "items": [
                ("IA Criterion C - Development & Technical Implementation (hal. 74–85, 82–83): coding the software product, implementing complex algorithmic techniques & data structures, modularity, code documentation, and authenticity checks", 16, 16),
                ("IA Criterion D - Functionality, Testing & Video Demonstration (hal. 74–85, 83): comprehensive execution testing against test plan, recording 2–7 minute unedited video demonstrating product functionality, and documenting product extensibility", 6, 6),
                ("IA Criterion E - Evaluation & Client Feedback (hal. 74–85, 83): testing product with real client, collecting client feedback, evaluating against Criterion A success criteria, and justifying future development recommendations", 6, 6),
            ]
        },
    ]

    # --- Calculations & Verification ---
    y1_sl = sum(item[1] for b in curriculum if b["year"] == "Year 1" for item in b["items"])
    y1_hl = sum(item[2] for b in curriculum if b["year"] == "Year 1" for item in b["items"])
    y2_sl = sum(item[1] for b in curriculum if b["year"] == "Year 2" for item in b["items"])
    y2_hl = sum(item[2] for b in curriculum if b["year"] == "Year 2" for item in b["items"])

    print(f"Year 1 SL Classes: {y1_sl} ({y1_sl * 45 / 60:.1f} hrs) | HL Classes: {y1_hl} ({y1_hl * 45 / 60:.1f} hrs)")
    print(f"Year 2 SL Classes: {y2_sl} ({y2_sl * 45 / 60:.1f} hrs) | HL Classes: {y2_hl} ({y2_hl * 45 / 60:.1f} hrs)")
    total_sl = y1_sl + y2_sl
    total_hl = y1_hl + y2_hl
    print(f"TOTAL SL Classes: {total_sl} = {total_sl * 45} min = {total_sl * 45 / 60:.1f} hrs (Target: 150.0 hrs)")
    print(f"TOTAL HL Classes: {total_hl} = {total_hl * 45} min = {total_hl * 45 / 60:.1f} hrs (Target: 240.0 hrs)")
    assert total_sl == 200, f"Expected 200 SL classes, got {total_sl}"
    assert total_hl == 320, f"Expected 320 HL classes, got {total_hl}"

    # Row templates
    trs = tbl.findall(qn("w:tr"))
    tr_template_topic = copy.deepcopy(trs[6])
    tr_template_cont = copy.deepcopy(trs[7])

    # Remove all data rows from row 6 onwards
    while len(tbl.findall(qn("w:tr"))) > 6:
        tbl.remove(tbl.findall(qn("w:tr"))[6])

    # Rebuild each topic block cleanly
    current_year = None
    for block in curriculum:
        year = block["year"]
        is_year_start = (year != current_year)
        if is_year_start:
            current_year = year

        topic_title = block["topic_title"]
        page_ref = block["page_ref"]

        for i, (content, sl_cls, hl_cls) in enumerate(block["items"]):
            if i == 0:
                # First row of a topic
                new_tr = copy.deepcopy(tr_template_topic)
                tcs = new_tr.findall(qn("w:tc"))
                if is_year_start:
                    set_vmerge(tcs[0], "restart")
                    set_tc_text(tcs[0], year, bold=True)
                else:
                    set_vmerge(tcs[0], None)
                    set_tc_text(tcs[0], "")

                set_vmerge(tcs[1], "restart")
                set_topic_tc(tcs[1], topic_title, page_ref)

                # Contents cell: NEVER HAVE vMerge!
                remove_vmerge(tcs[2])
                set_tc_text(tcs[2], content)

                # Allocated time cell: NEVER HAVE vMerge!
                remove_vmerge(tcs[3])
                set_alloc_tc(tcs[3], sl_cls, hl_cls)

                set_vmerge(tcs[4], "restart")
                set_tc_text(tcs[4], "")
                set_vmerge(tcs[5], "restart")
                set_tc_text(tcs[5], "")
                tbl.append(new_tr)
            else:
                # Continuation row
                new_tr = copy.deepcopy(tr_template_cont)
                tcs = new_tr.findall(qn("w:tc"))
                set_vmerge(tcs[0], None)
                set_tc_text(tcs[0], "")
                set_vmerge(tcs[1], None)
                set_tc_text(tcs[1], "")

                # Contents cell: NEVER HAVE vMerge!
                remove_vmerge(tcs[2])
                set_tc_text(tcs[2], content)

                # Allocated time cell: NEVER HAVE vMerge!
                remove_vmerge(tcs[3])
                set_alloc_tc(tcs[3], sl_cls, hl_cls)

                set_vmerge(tcs[4], None)
                set_tc_text(tcs[4], "")
                set_vmerge(tcs[5], None)
                set_tc_text(tcs[5], "")
                tbl.append(new_tr)

    doc.save(DOC_PATH)
    print(f"Successfully saved updated document to {DOC_PATH}!")
    print(f"Total rows in Table 1: {len(tbl.findall(qn('w:tr')))}")

if __name__ == "__main__":
    update_document()

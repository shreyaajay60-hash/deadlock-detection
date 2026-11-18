"""
Deadlock Detection Algorithm (Operating Systems)
Textbook Implementation (Silberschatz, Galvin, Gagne)
For multiple instances of each resource type.

Produces full, deterministic step-by-step traces for interactive visualization.
"""

from typing import List, Dict, Any, Tuple


class DeadlockDetector:
    def __init__(self, num_processes: int, num_resources: int,
                 available: List[int], allocation: List[List[int]],
                 request: List[List[int]], resource_names: List[str] = None):
        self.num_processes = num_processes
        self.num_resources = num_resources
        self.available = [int(x) for x in available]
        self.allocation = [[int(x) for x in row] for row in allocation]
        self.request = [[int(x) for x in row] for row in request]
        
        if resource_names and len(resource_names) == num_resources:
            self.resource_names = resource_names
        else:
            self.resource_names = [f"R{j}" for j in range(num_resources)]
            
        self.process_names = [f"P{i}" for i in range(num_processes)]

    def validate_inputs(self) -> Tuple[bool, str]:
        """Validate input dimensions and non-negative constraints."""
        if self.num_processes < 1 or self.num_resources < 1:
            return False, "Process and resource counts must be at least 1."
        if len(self.available) != self.num_resources:
            return False, f"Available vector length ({len(self.available)}) does not match resource count ({self.num_resources})."
        if len(self.allocation) != self.num_processes:
            return False, f"Allocation matrix rows ({len(self.allocation)}) do not match process count ({self.num_processes})."
        if len(self.request) != self.num_processes:
            return False, f"Request matrix rows ({len(self.request)}) do not match process count ({self.num_processes})."
            
        for i in range(self.num_processes):
            if len(self.allocation[i]) != self.num_resources:
                return False, f"Allocation row {i} length ({len(self.allocation[i])}) does not match resource count ({self.num_resources})."
            if len(self.request[i]) != self.num_resources:
                return False, f"Request row {i} length ({len(self.request[i])}) does not match resource count ({self.num_resources})."
            for j in range(self.num_resources):
                if self.allocation[i][j] < 0:
                    return False, f"Allocation[{i}][{j}] cannot be negative."
                if self.request[i][j] < 0:
                    return False, f"Request[{i}][{j}] cannot be negative."
                    
        for j in range(self.num_resources):
            if self.available[j] < 0:
                return False, f"Available[{j}] cannot be negative."

        return True, "Valid inputs"

    def execute_and_record(self) -> Dict[str, Any]:
        """
        Executes the deadlock detection algorithm and records every micro-step for animation.
        Returns a dictionary with complete execution metadata and step list.
        """
        valid, msg = self.validate_inputs()
        if not valid:
            raise ValueError(msg)

        steps: List[Dict[str, Any]] = []
        n = self.num_processes
        m = self.num_resources

        # 1. Initialize Work = Available
        work = list(self.available)
        
        # 2. Finish[i] = false if Allocation[i] != 0, else true
        finish = [False] * n
        for i in range(n):
            if all(self.allocation[i][j] == 0 for j in range(m)):
                finish[i] = True

        completed_sequence = []
        initial_zero_alloc = [i for i in range(n) if finish[i]]

        # Step 0: Initial State
        steps.append({
            "step_id": len(steps),
            "type": "INITIAL_STATE",
            "title": "Algorithm Initialization",
            "process_index": None,
            "work": list(work),
            "finish": list(finish),
            "completed_sequence": list(completed_sequence),
            "description": (
                f"Work vector initialized to Available: {work}. "
                f"Finish array initialized. Processes with zero allocation marked finished: "
                f"{[self.process_names[i] for i in initial_zero_alloc] if initial_zero_alloc else 'None'}."
            ),
            "highlight_process": None,
            "comparison": None,
            "can_proceed": None,
            "resources_released": None
        })

        # Detection iteration loop
        iteration = 1
        while True:
            found_candidate = False
            pass_completed_any = False
            
            steps.append({
                "step_id": len(steps),
                "type": "PASS_START",
                "title": f"Starting Evaluation Pass #{iteration}",
                "process_index": None,
                "work": list(work),
                "finish": list(finish),
                "completed_sequence": list(completed_sequence),
                "description": f"Beginning scan of remaining unfinished processes in Pass #{iteration}.",
                "highlight_process": None,
                "comparison": None,
                "can_proceed": None,
                "resources_released": None
            })

            # Evaluate each process in order
            for i in range(n):
                if finish[i]:
                    continue  # Already finished

                # Compare Request[i] with Work element-by-element
                comparison_details = []
                can_satisfy = True
                
                for j in range(m):
                    req_val = self.request[i][j]
                    work_val = work[j]
                    satisfied = (req_val <= work_val)
                    if not satisfied:
                        can_satisfy = False
                    comparison_details.append({
                        "resource": self.resource_names[j],
                        "resource_index": j,
                        "request": req_val,
                        "work": work_val,
                        "satisfied": satisfied
                    })

                # Step: Process Evaluation
                steps.append({
                    "step_id": len(steps),
                    "type": "PROCESS_EVALUATE",
                    "title": f"Evaluating Process {self.process_names[i]}",
                    "process_index": i,
                    "process_name": self.process_names[i],
                    "work": list(work),
                    "finish": list(finish),
                    "completed_sequence": list(completed_sequence),
                    "comparison": comparison_details,
                    "can_proceed": can_satisfy,
                    "description": (
                        f"Comparing Request of {self.process_names[i]} ({self.request[i]}) with Available Work ({work}). "
                        + (f"Request can be satisfied! ({self.process_names[i]} can proceed to completion)"
                           if can_satisfy else
                           f"Request CANNOT be satisfied currently. {self.process_names[i]} must wait.")
                    ),
                    "highlight_process": i,
                    "resources_released": None
                })

                if can_satisfy:
                    # Process executes and completes!
                    found_candidate = True
                    pass_completed_any = True
                    
                    work_before = list(work)
                    released = list(self.allocation[i])
                    
                    # Work = Work + Allocation[i]
                    for j in range(m):
                        work[j] += self.allocation[i][j]
                    finish[i] = True
                    completed_sequence.append(self.process_names[i])

                    # Step: Process Completion & Resource Reclaim
                    steps.append({
                        "step_id": len(steps),
                        "type": "PROCESS_COMPLETE",
                        "title": f"Process {self.process_names[i]} Completed",
                        "process_index": i,
                        "process_name": self.process_names[i],
                        "work": list(work),
                        "work_before": work_before,
                        "finish": list(finish),
                        "completed_sequence": list(completed_sequence),
                        "comparison": comparison_details,
                        "can_proceed": True,
                        "resources_released": released,
                        "flying_tokens": [
                            {"resource": self.resource_names[j], "resource_index": j, "count": released[j]}
                            for j in range(m) if released[j] > 0
                        ],
                        "description": (
                            f"{self.process_names[i]} finishes execution and releases its allocated resources: {released}. "
                            f"Work vector is updated: {work_before} + {released} = {work}."
                        ),
                        "highlight_process": i
                    })
                    
                    # After a process finishes, its resources might satisfy previously skipped processes
                    # Restart pass or continue? Standard algorithm: "go to step 2" (look for ANY index i)
                    # Breaking here and restarting from the top ensures deterministic first-fit order
                    break

            if not found_candidate:
                # No unfinished process could be satisfied in this pass
                break
            iteration += 1

        # Check final condition: Any Finish[i] == False?
        deadlocked_indices = [i for i in range(n) if not finish[i]]
        is_deadlocked = len(deadlocked_indices) > 0
        deadlocked_names = [self.process_names[i] for i in deadlocked_indices]

        # Final Step: Deadlock Evaluation & Conclusion
        conclusion_desc = ""
        if is_deadlocked:
            conclusion_desc = (
                f"DEADLOCK DETECTED! No remaining unfinished processes can have their requests satisfied. "
                f"Processes {', '.join(deadlocked_names)} are permanently deadlocked."
            )
        else:
            conclusion_desc = (
                f"NO DEADLOCK DETECTED! All processes successfully completed execution. "
                f"Safe completion sequence: {' -> '.join(completed_sequence)}."
            )

        steps.append({
            "step_id": len(steps),
            "type": "CONCLUSION",
            "title": "Deadlock Detection Conclusion",
            "process_index": None,
            "work": list(work),
            "finish": list(finish),
            "completed_sequence": list(completed_sequence),
            "is_deadlocked": is_deadlocked,
            "deadlocked_indices": deadlocked_indices,
            "deadlocked_processes": deadlocked_names,
            "description": conclusion_desc,
            "highlight_process": None,
            "comparison": None,
            "can_proceed": None,
            "resources_released": None
        })

        return {
            "num_processes": n,
            "num_resources": m,
            "process_names": self.process_names,
            "resource_names": self.resource_names,
            "initial_available": self.available,
            "allocation": self.allocation,
            "request": self.request,
            "is_deadlocked": is_deadlocked,
            "deadlocked_processes": deadlocked_names,
            "completion_sequence": completed_sequence,
            "total_steps": len(steps),
            "steps": steps
        }


def get_predefined_examples() -> Dict[str, Dict[str, Any]]:
    """Returns curated educational examples covering all major scenarios."""
    return {
        "no_deadlock": {
            "id": "no_deadlock",
            "title": "Example 1: Deadlock-Free System",
            "subtitle": "All processes complete in sequence by sharing and releasing resources",
            "num_processes": 4,
            "num_resources": 3,
            "resource_names": ["R0 (CPU)", "R1 (Memory)", "R2 (Disk)"],
            "available": [2, 1, 0],
            "allocation": [
                [0, 1, 0],  # P0
                [2, 0, 0],  # P1
                [3, 0, 3],  # P2
                [2, 1, 1],  # P3
            ],
            "request": [
                [0, 0, 0],  # P0 needs nothing, completes immediately
                [2, 0, 2],  # P1
                [0, 0, 0],  # P2
                [1, 0, 0],  # P3
            ],
            "expected_outcome": "No Deadlock"
        },
        "multi_deadlock": {
            "id": "multi_deadlock",
            "title": "Example 2: Multiple Processes Deadlocked",
            "subtitle": "Classic Silberschatz textbook deadlock detection case (P1-P4 deadlocked)",
            "num_processes": 5,
            "num_resources": 3,
            "resource_names": ["R0", "R1", "R2"],
            "available": [0, 0, 0],
            "allocation": [
                [0, 1, 0],  # P0
                [2, 0, 0],  # P1
                [3, 0, 3],  # P2
                [2, 1, 1],  # P3
                [0, 0, 2],  # P4
            ],
            "request": [
                [0, 0, 0],  # P0 (can finish and release [0, 1, 0])
                [2, 0, 2],  # P1 (needs R0:2, R2:2)
                [0, 0, 1],  # P2 (needs R2:1)
                [1, 0, 0],  # P3 (needs R0:1)
                [0, 0, 2],  # P4 (needs R2:2)
            ],
            "expected_outcome": "Deadlock (P1, P2, P3, P4)"
        },
        "partial_deadlock": {
            "id": "partial_deadlock",
            "title": "Example 3: Partial Deadlock",
            "subtitle": "P0 and P2 successfully complete, while P1 and P3 remain deadlocked",
            "num_processes": 4,
            "num_resources": 3,
            "resource_names": ["R0 (Scanner)", "R1 (Printer)", "R2 (Tape)"],
            "available": [0, 0, 1],
            "allocation": [
                [0, 0, 1],  # P0 holds Tape
                [1, 0, 0],  # P1 holds Scanner
                [0, 0, 1],  # P2 holds Tape
                [0, 1, 0],  # P3 holds Printer
            ],
            "request": [
                [0, 0, 1],  # P0 requests Tape (Satisfied by initial Work [0, 0, 1])
                [0, 1, 0],  # P1 requests Printer (Held by P3)
                [0, 0, 2],  # P2 requests Tape (Satisfied after P0 finishes!)
                [1, 0, 0],  # P3 requests Scanner (Held by P1)
            ],
            "expected_outcome": "Deadlock (P1, P3)"
        }
    }

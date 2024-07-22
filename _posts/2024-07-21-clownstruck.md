---
layout: post
permalink: /clownstruck/
title: 'CrowdStrike outage: The Unofficial Retrospective'
date: 2015-03-23 00:33
---

![clowdstrike fix teaser](/images/clownstruck-dark.png)

*Any sufficiently advanced incompetence is indistinguishable from malice.*

## 0. Introduction

Around 2024-07-19 04:09 UTC, CrowdStrike rolled out an update to its Falcon® platform.
This update caused millions of Windows machines to crash (Blue Screen of Death, or BSOD)
and prevented those machines from loading (boot loop),
which led to global outages in different systems and services,
such as emergency call centers, hospitals, banks, stock exchange and airports.

This post will provide a systems level perspective on what went wrong,
and what could have been done to prevent this.

<!-- more -->

If you want to avoid outages like this as a user of similar products,
this post provides a list of **questions** for software vendors
to help you determine if their processes are robust.

If you're a software vendor that wants to avoid causing widespread outages,
this post provides a list of **action items** to consider.

For an in-depth consultation on software development processes, feel free to contact me via [LinkedIn](https://www.linkedin.com/in/igor-malovitsa/) or [email](mailto:igor.mlvts@gmail.com)

There will be some speculation, as all of the conclusions here are made from publicly available information, personal experience, and generally accepted software development practices.
I will do my best to indicate what *must be true*, what is *speculative*, and to update the post in case of factual errors.

For example, *speculation*: CrowdStrike is unlikely to provide this level of analysis publicly,
as acknowledging poor practices or negligence could expose them to legal issues.

Following is a list of mistakes, roughly in decreasing order of severity.
Each item is accompanied by **questions** that a client might ask a software vendor,
and corresponding **action items** which a software vendor should consider.

This is not an exhaustive list of best practices for software development and delivery,
but it highlights the practices that were lacking in this scenario.
All of these mistakes *must* have occured for a single update to cause so much havoc.

These are not some deeply profound insights, sacred knowledge, or divine revelation.
They are the software development equivalents of not drinking water from the sewers.
Every mature company I worked with uses these practices, when applicable.
You've most likely heard of these practices as a part of the software development lifecycle (SDLC).

## 1. CrowdStrike clients (effectively) have no control over updates to the Falcon® platform

If your company maintains critical infrastructure, controlling the software you run is essential. 
Without this control, you cannot guarantee the reliability or security of your systems.
If a third-party software vendor pushes software updates without your approval,
it means you lose control over that piece of your infrastructure.
If that component is a kernel module, losing control means losing control over the OS,
the foundation of your infrastructure.

In this specific case, the crash was not caused by an update to the kernel module (`csagent.sys`),
but due to an update to a "Channel File" (`C-[digits]-[digits]-[digits].sys`, or C-files below).
*Speculation*: "Channel File" is a database of attack patterns and malware signatures, and it may serve other purposes. (Also see: US Patents [US11822515B2](https://patents.google.com/patent/US11822515B2/en) and [US11645397B2](https://patents.google.com/patent/US11645397B2/en), thanks to [@patrickwardle](https://x.com/patrickwardle/status/1814970239169282358) for highlighting this)
And the combined system of the kernel module and C-files causes the OS to crash.
Which means the end user must have control on the updates to C-files.

The CrowdStrike Falcon® platform does have a special property.  It's an antivirus.
(The marketing terms for the platform are "Endpoint Detection and Response (EDR)" and "The Definitive AI-Native Cybersecurity Platform".  For this post, we will refer to it as an fancy antivirus.)

A real-time antivirus is unique because it needs to:

1) ... integrate into the OS at a level that allows it to respond to malicious attacks as quickly as possible.
2) ... have an up-to-date database of attack patterns and malware signatures.

There is an inherent tension between the need for quick threat response and maintaining system stability.
Even in this situation, the end-user still must have the final say in the update process,
because the failure caused by an update has too large of an impact.
If there is an update that breaks the infrastructure sysadmins/ops must be able to prevent that.

*Speculation*: CrowdStrike Falcon® has configuration for updates of the kernel module, but not C-files.
Alternatively, there *is* configuration for all updates, and it was bypassed.

**Questions**: As users of your software, do we choose where and when to apply the updates?

**Action items**: Allow the user to configure an update plan.  Do not bypass the configuration of user's update plan.  If necessary, inform customers about the urgence of an update.

## 2. There are (effectively) no canary/staging/slow rollouts that ensure the update won't affect a large number of users

Since around millions of machines were affected by the rollout,
it indicates that the canary rollout system -- at least for the C-files -- either doesn't exist, is inadequate, or was bypassed.

If an update has the potential to affect end users, a gradual rollout is advisable.

In a mature company, updates are gradually rolled out to ensure that only a small proportion of users are affected in case of new issues. This way, the issue can be resolved before it affects all users.
(If the update can't be gradually rolled out, it's done during scheduled maintenance times.)

*Speculation*: There was no consideration that C-file updates could be dangerous,
so there were no canary rollouts for those updates. Alternatively, canary rollouts existed but were bypassed.

**Questions**: Do you have canary/staging/slow rollouts, to minimize the risk of updates?

**Action items**: Implement canary rollouts. Preferrably in a part of your company, to minimize the blast zone.
Do not bypass canary rollouts.

## 3. There is (effectively) no system to verify that the update won't brick customer machines

As an end user, you expect a product that has undergone thorough testing.
Since the delivered update caused all Windows machines to reliably crash (BSOD),
it *must be true* that the software and content update was not tested in its final, published form.

*Speculation*: CrowdStrike likely has a QA/testing step to ensure that changes are functioning properly,
but these tests are performed on pre-published artifacts.
At some point between testing and publishing, the final artifact (in this case, the C-file) was corrupted.

**Questions**: What is your approach to QA/testing?  Do you test the artifacts you deliver to the customer?

**Action items**: Have a rigorous QA/testing approach.  Have a proper CI/CD pipeline.  Test the final artifacts which will be published, in other words, do end-to-end testing.

## 4. The kernel module can't handle an invalid configuration/content file

It is crucial for software to handle corrupted and malicious inputs correctly.
In this scenario, the published C-file was filled with zeros (https://x.com/christian_tail/status/1814299095261147448).
This is one of the simplest cases of a malformed file, the simplest being an empty file.
Since this trivial case of a malformed content file caused an issue in the kernel module,
it *must be true* that the kernel module was not tested with malformed or malicious inputs (C-files).

There is a technique called fuzzing, which is inexpensive from a development perspective
and tests against a broad range of malicious inputs.
If you're parsing binary formats or handling potentially malicious input,
it is *imperative* for your team to implement fuzz testing on that software.
If that software is a kernel module, not testing with malicious inputs is inviting trouble.

Additionally, the C-files *must* adhere to a strict format,
and the kernel module *should* verify their format and hash/signature before processing.

**Questions**: Do you test your software with malicious input?
Do you do fuzz testing on critical software components?

**Action items**: Check that the software can handle invalid/malicious input.
File formats *must* have a strict format which is easy to verify.
Important files *should* be verified by checking their hash or signature before processing
Implement fuzz testing for critical software components.

## 5. The kernel module has an invalid pointer dereference bug

Several individuals, including [@GNET888](https://x.com/GNET888/status/1814371529590972766), [@patrickwardle](https://x.com/patrickwardle/status/1814343502886477857), [@ponbalaji](https://x.com/ponbalaji/status/1814278599199047887) ran the crashing Windows kernel in a debugger and identified the offending instruction.
The instruction involved loading from an address, `mov r9d, [r8]` (instruction address `csagent+035a1`) or `movzx eax, word ptr [rdx]` (instruction address `csagent+e41cd`),
and different people had different values in the address register `r8`, which were always invalid

This indicates a programmer error, possibly coupled with memory corruption or obtaining the address from an untrusted source.

In any case, this is a **severe bug** for a kernel module and must be fixed ASAP.
The address being read must come from a trusted source OR be strictly validated.
Ideally, a memory-safe language should be used to program a kernel module.
Additionally, as with the previous point, fuzz testing combined with an address sanitizer should be used to detect these kinds of errors.

If you need to read a value from an untrusted address in memory,
[there are proper ways to do it](https://github.com/illumos/illumos-gate/blob/846ac0dd/usr/src/uts/common/dtrace/dtrace.c#L449-L452).  For Windows kernel, you likely have to do it in a different way.

**Questions**: What happens when there's a programming error in a critical part of your software?
Do you use a memory safe language for critical software components?
What are the coding practices you use to develop software?

**Action items**: Minimize the attack surface and responsibility of your critical software components.
Avoid writing kernel modules.  Use memory safe languages for critical components.
Follow recommended coding practices/guides.  Use lint checkers and address sanitizers.

## 6. Pick at least one:

This section is mostly speculative, as the details of the update process are unclear.
However, there's evidence that this process can improve as well.

### 6.1. The updater received an invalid configuration/content file and didn't verify the format, hash, or signature

The Falcon® update client (potentially the same kernel module) downloaded the updates without validating the format, hash, or signature of the updated file.
These files were installed in the `crowdstrike` directory, and loading them caused the kernel module to crash.

Files can become corrupted for many reasons: network errors, memory bit flips, disk failures, or malicious third parties.  To avoid these issues, the files should have known hashes or signatures.

**Questions**: Do you sign the artifacts that you distribute?  Do you validate the content and signature of the artifacts before installation?

**Action items**: Sign the published artifacts.  Validate the hash and signature when loading a file.


### 6.2. The updater backend signed a corrupted file without validating its correctness

The publishing service received a corrupted file, didn't validate its format,
and signed and published the update.

**Questions**: Do you validate and sign the published artifacts?  (point 3.) Do you test the artifacts you deliver to the customer?

**Action items**: Add validation to the publishing service; if the file is malformed, prevent its publication

## None of this should be surprising

CrowdStrike has caused similar outages in the past,
indicating that the company's development process has been subpar for a long time.

2024-04-19:
> https://news.ycombinator.com/item?id=41005936
>
> Crowdstrike did this to our production linux fleet back on April 19th, and I've been dying to rant about it.
>
> The short version was: we're a civic tech lab, so we have a bunch of different production websites made at different times on different infrastructure. We run Crowdstrike provided by our enterprise. Crowdstrike pushed an update on a Friday evening that was incompatible with up-to-date Debian stable. So we patched Debian as usual, everything was fine for a week, and then all of our servers across multiple websites and cloud hosts simultaneously hard crashed and refused to boot.
> 
> When we connected one of the disks to a new machine and checked the logs, Crowdstrike looked like a culprit, so we manually deleted it, the machine booted, tried reinstalling it and the machine immediately crashes again. OK, let's file a support ticket and get an engineer on the line.
> 
> Crowdstrike took a day to respond, and then asked for a bunch more proof (beyond the above) that it was their fault. They acknowledged the bug a day later, and weeks later had a root cause analysis that they didn't cover our scenario (Debian stable running version n-1, I think, which is a supported configuration) in their test matrix. In our own post mortem there was no real ability to prevent the same thing from happening again -- "we push software to your machines any time we want, whether or not it's urgent, without testing it" seems to be core to the model, particularly if you're a small IT part of a large enterprise. What they're selling to the enterprise is exactly that they'll do that.

2023-07-18:
> https://old.reddit.com/r/sysadmin/comments/1594t5s/there_appears_to_be_another_widespread/
>
> There appears to be another widespread Crowdstrike BSOD issue with sensor 6.58 in July 2023. We had 2000 devices in the QA group set to version N and 27000 devices in N-1. 1200 devices out of 2000 experienced BSOD on 18th July 23 morning within few hours. It was BSOD in a reboot loop with Error/Stop Code "DRIVER OVERRAN STACK BUFFER" I was not allowed to post in the Crowdstrike community so sharing it here just to exchange peer experience.

This post from 2023-03-01 indicates that this error has already occured in 2019:
> https://old.reddit.com/r/sysadmin/comments/1594t5s/there_appears_to_be_another_widespread/
> About 1825 EST a coworker informed me that his and anothers machines BSOD with the "system thread exception not handled" due to csagent.sys.
> 
> I checked my machine and mine was as well. Some people still at the office were reporting machines BSOD all over the domain.
> 
> We have managed to recover our individual machines and rename the windows\system32\drivers\crowdstrike folder and it works, just like the issue from 2019 with 5.19. We are still on Windows 10, FWIW.
> 
> I contacted CS tech support and they wanted me to run cswindiag on it, and told me they have reports of other customers having the same issue as well.
> 
> We are rolling back to 6.50 for now to be safe, and no more auto updating.

2019-10-02:
> https://old.reddit.com/r/sysadmin/comments/dcbcov/crowdstrike_global_bsod_issue_with_519/
>
> Crowdstrike released a 5.19 update of their software, and is having a 'global BSOD issue'. It is not all machines with the update, but many.
>
> Just FYI if you have Crowdstrike and are having machines bluescreen suddenly.
>
> Good luck fixing it though, our affected machines are continually bluescreening every time they boot.
> 
> Edit - Only affects Crowdstrike and Symantec DLP machines
> 
> Edit - Work around is to rename windows\system32\drivers\crowdstrike and boot up.

2010-04-21 McAffee:
> https://www.zdnet.com/article/defective-mcafee-update-causes-worldwide-meltdown-of-xp-pcs/
> 
> McAfee's "DAT" file version 5958 is causing widespread problems with Windows XP SP3. The affected systems will enter a reboot loop and [lose] all network access.

> https://www.zdnet.com/article/mcafee-admits-inadequate-quality-control-caused-pc-meltdown/
>
> 8. How did this DAT file get through McAfee’s Quality Assurance process?
>
> There are two primary causes for why this DAT file got through our quality processes:
> 
> 1) Process – Some specific steps of the existing Quality Assurance processes were not followed:  Standard Peer Review of the driver was not done, and the Risk Assessment of the driver in question was inadequate. Had it been adequate it would have triggered additional Quality Assurance steps.
> 
> 2) Product Testing – there was inadequate coverage of Product and Operating System combinations in the test systems used. Specifically, XP SP3 with VSE 8.7 was not included in the test configuration at the time of release.

Why is the McAfee incident relevant?  Because the <abbr title="as of 2024-07-21">current</abbr> CEO of CrowdStrike was the CTO of McAfee when these issues occurred.
The higher you are on the corporate ladder, the more influence you have over company processes.
It is the responsibility of upper management to ensure that the company adheres to good software development practices.

## Path to improvement

For things to improve, everyone must agree that improvement is necessary and choose a direction for improvement.

This post highlights practices that were clearly lacking.
It is not meant to be an exhaustive list of good software practices, but it is a good start.

Clients need to push software vendors to use proper software development practices (proper SDLC, if you will).

Software vendors must follow proper software development practices.
Software vendors must respect their clients.

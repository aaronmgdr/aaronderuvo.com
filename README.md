# aaronderuvo.com
Personal Professional Site


Personal site content

PAGES
	HOME  (about me)
	Opinion (a few essays on tech and startups) 
	Investigate
	Work
		Github
		LinkedIn
		
Goals
	Maintenance free
		No Dependencies
		Always true statements

Setup with ens?  	

Hosting
	claudflare

Runtime
	11ty https://www.11ty.dev/docs/

summaries are generated locally and committed

	npm run summaries

Runs LFM2-1.2B on device via transformers.js — no API key, no network after the
first run. Weights (~800MB) cache in ~/.cache/huggingface, outside the repo;
nothing model-related is committed. Only writes slugs that have no summary yet;
pass --force to regenerate everything. Override with SUMMARY_MODEL /
SUMMARY_DTYPE (e.g. onnx-community/LFM2.5-350M-ONNX for a smaller download).
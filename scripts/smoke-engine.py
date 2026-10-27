"""Smoke-test the packaged engine: optional model name/path argument (default tiny)."""
import json, os, pathlib, subprocess, sys, time, urllib.request
root=pathlib.Path(__file__).resolve().parents[1]
exe=root/'engine-dist'/'gosu-engine'/('gosu-engine.exe' if os.name=='nt' else 'gosu-engine')
env=dict(os.environ,GOSU_MODEL=sys.argv[1] if len(sys.argv)>1 else 'tiny',VOZ_MANAGED='1')
with open(root/'engine-smoke.log','w') as log:
    proc=subprocess.Popen([str(exe)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=log,text=True,env=env)
    try:
        conn=json.loads(proc.stdout.readline())
        deadline=time.monotonic()+180
        while time.monotonic()<deadline:
            if proc.poll() is not None: raise RuntimeError('Engine exited: see engine-smoke.log')
            try:
                with urllib.request.urlopen(conn['base_url']+'/health',timeout=2) as response:
                    result=json.load(response)
                if result['ready']: break
            except OSError: pass
            time.sleep(.5)
        else: raise TimeoutError('See engine-smoke.log (model download may need more time)')
        print('Engine health OK:',result)
        proc.stdin.close()
        proc.wait(timeout=10)
        print('Parent disconnect cleanup OK')
    finally:
        if proc.poll() is None: proc.kill();proc.wait()

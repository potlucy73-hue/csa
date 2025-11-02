modules = ['api','auth','payments','admin','github_integration','database','fmcsa_scraper','data_processor']
for m in modules:
    try:
        __import__(m)
        print(f'IMPORT_OK: {m}')
    except Exception as e:
        print(f'IMPORT_ERR: {m}: {e}')

# test deployment for lex-provisioner

Deploy with
```bash
aws cloudformation deploy-stack \
    --stack-name <NAME> \

```


```bash
aws s3 mb s3://elliott-provisioner
```

Next, run the following command to package our Lambda function to S3:

```bash
sam package \
    --output-template-file packaged.yaml \
    --s3-bucket elliott-provisioner
```

Next, the following command will create a Cloudformation Stack and deploy your SAM resources.

```bash
aws cloudformation deploy --template-file <PATH_TO>/packaged.yaml --stack-name <STACK_NAME>
```

```bash
aws cloudformation describe-stacks \
    --stack-name <NAME> \
    --query 'Stacks[].Outputs'
```

```bash
aws cloudformation delete-stack --stack-name <NAME>
```


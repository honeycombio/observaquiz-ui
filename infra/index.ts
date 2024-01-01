import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as synced from "@pulumi/synced-folder";

const coreInfra = new pulumi.StackReference("honeycomb-devrel/booth-game/booth-game");

const siteBucketOutput = coreInfra.requireOutput("siteBucketName");
const cloudfrontDomainOutput = coreInfra.requireOutput("cloudfrontDomainName");

const siteBucket = aws.s3.Bucket.get("site-bucket", siteBucketOutput);

const folder = new synced.S3BucketFolder("synced-folder", {
    path: "../dist",
    bucketName: siteBucket.bucket,
    acl: aws.s3.BucketOwnerFullControlAcl,
});

// Export the URL to production
export const SiteUrl = cloudfrontDomainOutput;

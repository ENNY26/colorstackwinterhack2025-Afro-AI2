package storage

import (
	"bytes"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/google/uuid"
	
	"afrolingo-backend/internal/config"
)

type S3Client struct {
	s3Client *s3.S3
	bucket   string
}

func NewS3Client() (*S3Client, error) {
	sess, err := session.NewSession(&aws.Config{
		Region: aws.String(config.AppConfig.AWS.Region),
		Credentials: credentials.NewStaticCredentials(
			config.AppConfig.AWS.AccessKeyID,
			config.AppConfig.AWS.SecretAccessKey,
			"",
		),
	})
	if err != nil {
		return nil, err
	}

	return &S3Client{
		s3Client: s3.New(sess),
		bucket:   config.AppConfig.AWS.BucketName,
	}, nil
}

func (c *S3Client) UploadAudio(data []byte, contentType string) (string, error) {
	key := fmt.Sprintf("audio/%s/%s.mp3", time.Now().Format("2006/01/02"), uuid.New().String())

	_, err := c.s3Client.PutObject(&s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
		ACL:         aws.String("private"),
	})
	if err != nil {
		return "", err
	}

	// Generate presigned URL (valid for 7 days)
	req, _ := c.s3Client.GetObjectRequest(&s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	
	url, err := req.Presign(7 * 24 * time.Hour)
	if err != nil {
		return "", err
	}

	return url, nil
}

func (c *S3Client) DeleteAudio(key string) error {
	_, err := c.s3Client.DeleteObject(&s3.DeleteObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	return err
}

func (c *S3Client) GetPresignedURL(key string, expiry time.Duration) (string, error) {
	req, _ := c.s3Client.GetObjectRequest(&s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	
	url, err := req.Presign(expiry)
	if err != nil {
		return "", err
	}

	return url, nil
}


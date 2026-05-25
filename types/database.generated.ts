export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  feasiai: {
    Tables: {
      contractor_answers: {
        Row: {
          answer_text: string | null
          context: string | null
          correction_item_id: string | null
          created_at: string
          id: string
          is_answered: boolean
          options: Json | null
          output_id: string | null
          project_id: string
          question_key: string
          question_text: string
          question_type: Database["feasiai"]["Enums"]["question_type"]
          updated_at: string
        }
        Insert: {
          answer_text?: string | null
          context?: string | null
          correction_item_id?: string | null
          created_at?: string
          id?: string
          is_answered?: boolean
          options?: Json | null
          output_id?: string | null
          project_id: string
          question_key: string
          question_text: string
          question_type?: Database["feasiai"]["Enums"]["question_type"]
          updated_at?: string
        }
        Update: {
          answer_text?: string | null
          context?: string | null
          correction_item_id?: string | null
          created_at?: string
          id?: string
          is_answered?: boolean
          options?: Json | null
          output_id?: string | null
          project_id?: string
          question_key?: string
          question_text?: string
          question_type?: Database["feasiai"]["Enums"]["question_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_answers_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_answers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          file_type: Database["feasiai"]["Enums"]["file_type"]
          filename: string
          id: string
          mime_type: string | null
          project_id: string
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_type: Database["feasiai"]["Enums"]["file_type"]
          filename: string
          id?: string
          mime_type?: string | null
          project_id: string
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          created_at?: string
          file_type?: Database["feasiai"]["Enums"]["file_type"]
          filename?: string
          id?: string
          mime_type?: string | null
          project_id?: string
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: number
          project_id: string
          role: Database["feasiai"]["Enums"]["message_role"]
        }
        Insert: {
          content: string
          created_at?: string
          id?: number
          project_id: string
          role: Database["feasiai"]["Enums"]["message_role"]
        }
        Update: {
          content?: string
          created_at?: string
          id?: number
          project_id?: string
          role?: Database["feasiai"]["Enums"]["message_role"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      outputs: {
        Row: {
          agent_cost_usd: number | null
          agent_duration_ms: number | null
          agent_turns: number | null
          confidence_score: number | null
          contractor_questions_json: Json | null
          corrections_analysis_json: Json | null
          corrections_letter_md: string | null
          corrections_letter_pdf_path: string | null
          corrections_report_md: string | null
          created_at: string
          executive_summary_md: string | null
          feasibility_report_md: string | null
          flow_phase: Database["feasiai"]["Enums"]["flow_phase"]
          id: string
          plan_analysis_json: Json | null
          professional_scope_md: string | null
          project_id: string
          raw_artifacts: Json | null
          response_letter_md: string | null
          response_letter_pdf_path: string | null
          review_checklist_json: Json | null
          strategy_comparison_json: Json | null
          validation_issues: Json | null
          validation_status: string | null
          version: number
        }
        Insert: {
          agent_cost_usd?: number | null
          agent_duration_ms?: number | null
          agent_turns?: number | null
          confidence_score?: number | null
          contractor_questions_json?: Json | null
          corrections_analysis_json?: Json | null
          corrections_letter_md?: string | null
          corrections_letter_pdf_path?: string | null
          corrections_report_md?: string | null
          created_at?: string
          executive_summary_md?: string | null
          feasibility_report_md?: string | null
          flow_phase: Database["feasiai"]["Enums"]["flow_phase"]
          id?: string
          plan_analysis_json?: Json | null
          professional_scope_md?: string | null
          project_id: string
          raw_artifacts?: Json | null
          response_letter_md?: string | null
          response_letter_pdf_path?: string | null
          review_checklist_json?: Json | null
          strategy_comparison_json?: Json | null
          validation_issues?: Json | null
          validation_status?: string | null
          version?: number
        }
        Update: {
          agent_cost_usd?: number | null
          agent_duration_ms?: number | null
          agent_turns?: number | null
          confidence_score?: number | null
          contractor_questions_json?: Json | null
          corrections_analysis_json?: Json | null
          corrections_letter_md?: string | null
          corrections_letter_pdf_path?: string | null
          corrections_report_md?: string | null
          created_at?: string
          executive_summary_md?: string | null
          feasibility_report_md?: string | null
          flow_phase?: Database["feasiai"]["Enums"]["flow_phase"]
          id?: string
          plan_analysis_json?: Json | null
          professional_scope_md?: string | null
          project_id?: string
          raw_artifacts?: Json | null
          response_letter_md?: string | null
          response_letter_pdf_path?: string | null
          review_checklist_json?: Json | null
          strategy_comparison_json?: Json | null
          validation_issues?: Json | null
          validation_status?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "outputs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          applicant_name: string | null
          chip_tier: string | null
          city: string | null
          created_at: string
          error_message: string | null
          existing_building_year: number | null
          existing_parking: number | null
          existing_units: number | null
          flow_type: Database["feasiai"]["Enums"]["flow_type"]
          hazard_zones: string | null
          id: string
          is_demo: boolean
          lot_depth: number | null
          lot_size: number | null
          lot_width: number | null
          project_address: string | null
          project_name: string
          resume_params: Json | null
          rso_units: number | null
          specific_plan: string | null
          status: Database["feasiai"]["Enums"]["project_status"]
          street_dedication_data: Json | null
          toc_tier: string | null
          transit_proximity: boolean | null
          unit_mix: Json | null
          updated_at: string
          user_id: string
          zone: string | null
        }
        Insert: {
          applicant_name?: string | null
          chip_tier?: string | null
          city?: string | null
          created_at?: string
          error_message?: string | null
          existing_building_year?: number | null
          existing_parking?: number | null
          existing_units?: number | null
          flow_type: Database["feasiai"]["Enums"]["flow_type"]
          hazard_zones?: string | null
          id?: string
          is_demo?: boolean
          lot_depth?: number | null
          lot_size?: number | null
          lot_width?: number | null
          project_address?: string | null
          project_name: string
          resume_params?: Json | null
          rso_units?: number | null
          specific_plan?: string | null
          status?: Database["feasiai"]["Enums"]["project_status"]
          street_dedication_data?: Json | null
          toc_tier?: string | null
          transit_proximity?: boolean | null
          unit_mix?: Json | null
          updated_at?: string
          user_id: string
          zone?: string | null
        }
        Update: {
          applicant_name?: string | null
          chip_tier?: string | null
          city?: string | null
          created_at?: string
          error_message?: string | null
          existing_building_year?: number | null
          existing_parking?: number | null
          existing_units?: number | null
          flow_type?: Database["feasiai"]["Enums"]["flow_type"]
          hazard_zones?: string | null
          id?: string
          is_demo?: boolean
          lot_depth?: number | null
          lot_size?: number | null
          lot_width?: number | null
          project_address?: string | null
          project_name?: string
          resume_params?: Json | null
          rso_units?: number | null
          specific_plan?: string | null
          status?: Database["feasiai"]["Enums"]["project_status"]
          street_dedication_data?: Json | null
          toc_tier?: string | null
          transit_proximity?: boolean | null
          unit_mix?: Json | null
          updated_at?: string
          user_id?: string
          zone?: string | null
        }
        Relationships: []
      }
      validation_results: {
        Row: {
          created_at: string
          id: string
          issues: Json | null
          model_used: string | null
          output_id: string
          score: number
          tier: string
        }
        Insert: {
          created_at?: string
          id?: string
          issues?: Json | null
          model_used?: string | null
          output_id: string
          score: number
          tier: string
        }
        Update: {
          created_at?: string
          id?: string
          issues?: Json | null
          model_used?: string | null
          output_id?: string
          score?: number
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_results_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "outputs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      file_type: "plan-binder" | "corrections-letter" | "other"
      flow_phase: "analysis" | "response" | "review" | "feasibility"
      flow_type: "city-review" | "corrections-analysis" | "feasibility-analysis"
      message_role: "system" | "assistant" | "tool"
      project_status:
        | "ready"
        | "uploading"
        | "processing"
        | "processing-phase1"
        | "awaiting-answers"
        | "processing-phase2"
        | "completed"
        | "failed"
        | "processing-feasibility"
        | "paused"
        | "needs_review"
      question_type:
        | "text"
        | "number"
        | "choice"
        | "multi_choice"
        | "measurement"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_accounts: {
        Row: {
          created_at: string
          credit_balance: number
          id: string
          low_credit_notified_at: string | null
          low_credit_threshold: number | null
          plan_type: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          credit_balance?: number
          id?: string
          low_credit_notified_at?: string | null
          low_credit_threshold?: number | null
          plan_type?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          credit_balance?: number
          id?: string
          low_credit_notified_at?: string | null
          low_credit_threshold?: number | null
          plan_type?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string
          description: string
          id: string
          pipeline_run_id: string | null
          project_id: string | null
          reference_id: string | null
          reference_type: string | null
          transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
          workspace_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by: string
          description: string
          id?: string
          pipeline_run_id?: string | null
          project_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: Database["public"]["Enums"]["credit_transaction_type"]
          workspace_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          pipeline_run_id?: string | null
          project_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: Database["public"]["Enums"]["credit_transaction_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ledger_project"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ledger_run"
            columns: ["pipeline_run_id"]
            isOneToOne: false
            referencedRelation: "pipeline_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          category: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          email_id: string | null
          email_sent_at: string | null
          icon: string | null
          id: string
          metadata: Json | null
          read_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          category: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          email_id?: string | null
          email_sent_at?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          category?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          email_id?: string | null
          email_sent_at?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      pipeline_messages: {
        Row: {
          agent_name: string | null
          content: string
          created_at: string
          id: string
          phase: string | null
          project_id: string
          role: Database["public"]["Enums"]["message_role"]
          run_id: string
        }
        Insert: {
          agent_name?: string | null
          content: string
          created_at?: string
          id?: string
          phase?: string | null
          project_id: string
          role: Database["public"]["Enums"]["message_role"]
          run_id: string
        }
        Update: {
          agent_name?: string | null
          content?: string
          created_at?: string
          id?: string
          phase?: string | null
          project_id?: string
          role?: Database["public"]["Enums"]["message_role"]
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_messages_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pipeline_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_runs: {
        Row: {
          agent_cost_usd: number | null
          agent_duration_ms: number | null
          agent_turns: number | null
          completed_at: string | null
          config: Json | null
          created_at: string
          credits_consumed: number | null
          credits_estimated: number | null
          error_code: string | null
          error_message: string | null
          flow_type: Database["public"]["Enums"]["flow_type"]
          id: string
          paused_at: string | null
          phase: string | null
          project_id: string
          result_summary: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["pipeline_status"]
          triggered_by: string
          updated_at: string
        }
        Insert: {
          agent_cost_usd?: number | null
          agent_duration_ms?: number | null
          agent_turns?: number | null
          completed_at?: string | null
          config?: Json | null
          created_at?: string
          credits_consumed?: number | null
          credits_estimated?: number | null
          error_code?: string | null
          error_message?: string | null
          flow_type: Database["public"]["Enums"]["flow_type"]
          id?: string
          paused_at?: string | null
          phase?: string | null
          project_id: string
          result_summary?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["pipeline_status"]
          triggered_by: string
          updated_at?: string
        }
        Update: {
          agent_cost_usd?: number | null
          agent_duration_ms?: number | null
          agent_turns?: number | null
          completed_at?: string | null
          config?: Json | null
          created_at?: string
          credits_consumed?: number | null
          credits_estimated?: number | null
          error_code?: string | null
          error_message?: string | null
          flow_type?: Database["public"]["Enums"]["flow_type"]
          id?: string
          paused_at?: string | null
          phase?: string | null
          project_id?: string
          result_summary?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["pipeline_status"]
          triggered_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_active_at: string | null
          location_city: string | null
          location_state: string | null
          onboarding_data: Json | null
          onboarding_status: Database["public"]["Enums"]["onboarding_status"]
          phone: string | null
          profession: Database["public"]["Enums"]["profession_type"] | null
          referral_code: string | null
          system_role: Database["public"]["Enums"]["system_role"] | null
          timezone: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_active_at?: string | null
          location_city?: string | null
          location_state?: string | null
          onboarding_data?: Json | null
          onboarding_status?: Database["public"]["Enums"]["onboarding_status"]
          phone?: string | null
          profession?: Database["public"]["Enums"]["profession_type"] | null
          referral_code?: string | null
          system_role?: Database["public"]["Enums"]["system_role"] | null
          timezone?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_active_at?: string | null
          location_city?: string | null
          location_state?: string | null
          onboarding_data?: Json | null
          onboarding_status?: Database["public"]["Enums"]["onboarding_status"]
          phone?: string | null
          profession?: Database["public"]["Enums"]["profession_type"] | null
          referral_code?: string | null
          system_role?: Database["public"]["Enums"]["system_role"] | null
          timezone?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      project_collaborations: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string | null
          grantee_user_id: string | null
          grantee_workspace_id: string | null
          id: string
          invite_token: string | null
          invited_by: string
          project_id: string
          report_id: string | null
          scope: Database["public"]["Enums"]["collaboration_scope"]
          status: Database["public"]["Enums"]["collaboration_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string | null
          grantee_user_id?: string | null
          grantee_workspace_id?: string | null
          id?: string
          invite_token?: string | null
          invited_by: string
          project_id: string
          report_id?: string | null
          scope?: Database["public"]["Enums"]["collaboration_scope"]
          status?: Database["public"]["Enums"]["collaboration_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string | null
          grantee_user_id?: string | null
          grantee_workspace_id?: string | null
          id?: string
          invite_token?: string | null
          invited_by?: string
          project_id?: string
          report_id?: string | null
          scope?: Database["public"]["Enums"]["collaboration_scope"]
          status?: Database["public"]["Enums"]["collaboration_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborations_grantee_workspace_id_fkey"
            columns: ["grantee_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_collaborations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_collaborations_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          created_at: string
          extracted_data: Json | null
          file_name: string
          file_size: number | null
          file_type: Database["public"]["Enums"]["file_type"]
          id: string
          is_processed: boolean | null
          mime_type: string | null
          page_count: number | null
          project_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          extracted_data?: Json | null
          file_name: string
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"]
          id?: string
          is_processed?: boolean | null
          mime_type?: string | null
          page_count?: number | null
          project_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          extracted_data?: Json | null
          file_name?: string
          file_size?: number | null
          file_type?: Database["public"]["Enums"]["file_type"]
          id?: string
          is_processed?: boolean | null
          mime_type?: string | null
          page_count?: number | null
          project_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          apn: string | null
          budget: number | null
          chip_tier: string | null
          city: string | null
          created_at: string
          created_by: string
          credits_used: number | null
          current_phase: string | null
          description: string | null
          generation_tier: string | null
          existing_building_year: number | null
          existing_parking: number | null
          existing_sqft: number | null
          existing_units: number | null
          flow_type: Database["public"]["Enums"]["flow_type"]
          hazard_zones: string | null
          id: string
          is_demo: boolean
          lat: number | null
          lng: number | null
          lot_depth: number | null
          lot_size_sqft: number | null
          lot_width: number | null
          name: string
          num_units: number | null
          property_type: string | null
          proposed_sqft: number | null
          rso_units: number | null
          specific_plan: string | null
          state: string | null
          status: Database["public"]["Enums"]["project_status"]
          street_dedication_data: Json | null
          toc_tier: string | null
          transit_proximity: boolean | null
          unit_mix: Json | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          workspace_id: string
          zip: string | null
          zone: string | null
          zoning_data: Json | null
        }
        Insert: {
          address?: string | null
          apn?: string | null
          budget?: number | null
          chip_tier?: string | null
          city?: string | null
          created_at?: string
          created_by: string
          credits_used?: number | null
          current_phase?: string | null
          description?: string | null
          generation_tier?: string | null
          existing_building_year?: number | null
          existing_parking?: number | null
          existing_sqft?: number | null
          existing_units?: number | null
          flow_type: Database["public"]["Enums"]["flow_type"]
          hazard_zones?: string | null
          id?: string
          is_demo?: boolean
          lat?: number | null
          lng?: number | null
          lot_depth?: number | null
          lot_size_sqft?: number | null
          lot_width?: number | null
          name: string
          num_units?: number | null
          property_type?: string | null
          proposed_sqft?: number | null
          rso_units?: number | null
          specific_plan?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          street_dedication_data?: Json | null
          toc_tier?: string | null
          transit_proximity?: boolean | null
          unit_mix?: Json | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          workspace_id: string
          zip?: string | null
          zone?: string | null
          zoning_data?: Json | null
        }
        Update: {
          address?: string | null
          apn?: string | null
          budget?: number | null
          chip_tier?: string | null
          city?: string | null
          created_at?: string
          created_by?: string
          credits_used?: number | null
          current_phase?: string | null
          description?: string | null
          generation_tier?: string | null
          existing_building_year?: number | null
          existing_parking?: number | null
          existing_sqft?: number | null
          existing_units?: number | null
          flow_type?: Database["public"]["Enums"]["flow_type"]
          hazard_zones?: string | null
          id?: string
          is_demo?: boolean
          lat?: number | null
          lng?: number | null
          lot_depth?: number | null
          lot_size_sqft?: number | null
          lot_width?: number | null
          name?: string
          num_units?: number | null
          property_type?: string | null
          proposed_sqft?: number | null
          rso_units?: number | null
          specific_plan?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          street_dedication_data?: Json | null
          toc_tier?: string | null
          transit_proximity?: boolean | null
          unit_mix?: Json | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          workspace_id?: string
          zip?: string | null
          zone?: string | null
          zoning_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_events: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["referral_event_type"]
          id: string
          ip_hash: string | null
          metadata: Json | null
          referral_link_id: string
          session_id: string | null
          user_agent_hash: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["referral_event_type"]
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          referral_link_id: string
          session_id?: string | null
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["referral_event_type"]
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          referral_link_id?: string
          session_id?: string | null
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_events_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "referral_links"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_links: {
        Row: {
          campaign_name: string | null
          campaign_source: string | null
          click_count: number | null
          code: string
          conversion_count: number | null
          created_at: string
          created_by: string
          destination_url: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          owner_user_id: string | null
          owner_workspace_id: string | null
          signup_count: number | null
        }
        Insert: {
          campaign_name?: string | null
          campaign_source?: string | null
          click_count?: number | null
          code: string
          conversion_count?: number | null
          created_at?: string
          created_by: string
          destination_url?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          owner_user_id?: string | null
          owner_workspace_id?: string | null
          signup_count?: number | null
        }
        Update: {
          campaign_name?: string | null
          campaign_source?: string | null
          click_count?: number | null
          code?: string
          conversion_count?: number | null
          created_at?: string
          created_by?: string
          destination_url?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          owner_user_id?: string | null
          owner_workspace_id?: string | null
          signup_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_links_owner_workspace_id_fkey"
            columns: ["owner_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      report_comments: {
        Row: {
          anchor_id: string | null
          anchor_text: string | null
          content: string
          created_at: string
          created_by: string
          id: string
          is_resolved: boolean | null
          parent_id: string | null
          report_id: string
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
        }
        Insert: {
          anchor_id?: string | null
          anchor_text?: string | null
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_resolved?: boolean | null
          parent_id?: string | null
          report_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Update: {
          anchor_id?: string | null
          anchor_text?: string | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_resolved?: boolean | null
          parent_id?: string | null
          report_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "report_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_feedback: {
        Row: {
          applied_at: string | null
          applied_to_pipeline: boolean | null
          city: string | null
          corrected_by: string
          corrected_content: string
          correction_type: Database["public"]["Enums"]["correction_type"]
          created_at: string
          flow_type: Database["public"]["Enums"]["flow_type"] | null
          id: string
          original_content: string
          report_id: string
          section_path: string
          version_from: number
          version_to: number
        }
        Insert: {
          applied_at?: string | null
          applied_to_pipeline?: boolean | null
          city?: string | null
          corrected_by: string
          corrected_content: string
          correction_type?: Database["public"]["Enums"]["correction_type"]
          created_at?: string
          flow_type?: Database["public"]["Enums"]["flow_type"] | null
          id?: string
          original_content: string
          report_id: string
          section_path: string
          version_from: number
          version_to: number
        }
        Update: {
          applied_at?: string | null
          applied_to_pipeline?: boolean | null
          city?: string | null
          corrected_by?: string
          corrected_content?: string
          correction_type?: Database["public"]["Enums"]["correction_type"]
          created_at?: string
          flow_type?: Database["public"]["Enums"]["flow_type"] | null
          id?: string
          original_content?: string
          report_id?: string
          section_path?: string
          version_from?: number
          version_to?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_feedback_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_versions: {
        Row: {
          change_summary: string | null
          change_type: string | null
          content: Json
          created_at: string
          created_by: string
          id: string
          report_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          change_type?: string | null
          content: Json
          created_at?: string
          created_by: string
          id?: string
          report_id: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          change_type?: string | null
          content?: Json
          created_at?: string
          created_by?: string
          id?: string
          report_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_versions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          content: Json
          created_at: string
          created_by: string
          current_version: number
          id: string
          is_paywalled: boolean | null
          is_public: boolean | null
          preview_percentage: number | null
          project_id: string
          public_token: string | null
          report_type: Database["public"]["Enums"]["flow_type"]
          status: Database["public"]["Enums"]["report_status"]
          title: string
          unlock_credits: number | null
          updated_at: string
          verification_notes: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          workspace_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by: string
          current_version?: number
          id?: string
          is_paywalled?: boolean | null
          is_public?: boolean | null
          preview_percentage?: number | null
          project_id: string
          public_token?: string | null
          report_type: Database["public"]["Enums"]["flow_type"]
          status?: Database["public"]["Enums"]["report_status"]
          title: string
          unlock_credits?: number | null
          updated_at?: string
          verification_notes?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          workspace_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string
          current_version?: number
          id?: string
          is_paywalled?: boolean | null
          is_public?: boolean | null
          preview_percentage?: number | null
          project_id?: string
          public_token?: string | null
          report_type?: Database["public"]["Enums"]["flow_type"]
          status?: Database["public"]["Enums"]["report_status"]
          title?: string
          unlock_credits?: number | null
          updated_at?: string
          verification_notes?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_edges: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          relationship: string
          source_skill_id: string
          target_skill_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          relationship: string
          source_skill_id: string
          target_skill_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          relationship?: string
          source_skill_id?: string
          target_skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_edges_source_skill_id_fkey"
            columns: ["source_skill_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_edges_target_skill_id_fkey"
            columns: ["target_skill_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_executions: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          feedback_notes: string | null
          flow_type: string
          human_feedback_score: number | null
          id: string
          input_hash: string | null
          output_hash: string | null
          project_id: string | null
          skill_node_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          feedback_notes?: string | null
          flow_type: string
          human_feedback_score?: number | null
          id?: string
          input_hash?: string | null
          output_hash?: string | null
          project_id?: string | null
          skill_node_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          feedback_notes?: string | null
          flow_type?: string
          human_feedback_score?: number | null
          id?: string
          input_hash?: string | null
          output_hash?: string | null
          project_id?: string | null
          skill_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_executions_skill_node_id_fkey"
            columns: ["skill_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_nodes: {
        Row: {
          accuracy_score: number | null
          content_hash: string | null
          created_at: string | null
          id: string
          last_verified: string | null
          maturity: string | null
          metadata: Json | null
          name: string
          source_registry_ids: string[] | null
          total_executions: number | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          accuracy_score?: number | null
          content_hash?: string | null
          created_at?: string | null
          id?: string
          last_verified?: string | null
          maturity?: string | null
          metadata?: Json | null
          name: string
          source_registry_ids?: string[] | null
          total_executions?: number | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          accuracy_score?: number | null
          content_hash?: string | null
          created_at?: string | null
          id?: string
          last_verified?: string | null
          maturity?: string | null
          metadata?: Json | null
          name?: string
          source_registry_ids?: string[] | null
          total_executions?: number | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      source_registry: {
        Row: {
          associated_skills: string[] | null
          check_frequency_hours: number | null
          content_hash: string | null
          created_at: string | null
          id: string
          last_checked: string | null
          status: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          associated_skills?: string[] | null
          check_frequency_hours?: number | null
          content_hash?: string | null
          created_at?: string | null
          id?: string
          last_checked?: string | null
          status?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          associated_skills?: string[] | null
          check_frequency_hours?: number | null
          content_hash?: string | null
          created_at?: string | null
          id?: string
          last_checked?: string | null
          status?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["workspace_role"]
          status: Database["public"]["Enums"]["collaboration_status"]
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: Database["public"]["Enums"]["collaboration_status"]
          token: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: Database["public"]["Enums"]["collaboration_status"]
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_memberships: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_memberships_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          company_name: string | null
          company_size: string | null
          company_type: string | null
          company_website: string | null
          created_at: string
          created_by: string
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          type: Database["public"]["Enums"]["workspace_type"]
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          company_size?: string | null
          company_type?: string | null
          company_website?: string | null
          created_at?: string
          created_by: string
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          type?: Database["public"]["Enums"]["workspace_type"]
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          company_size?: string | null
          company_type?: string | null
          company_website?: string | null
          created_at?: string
          created_by?: string
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          type?: Database["public"]["Enums"]["workspace_type"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_stale_sources: {
        Args: { p_max_sources?: number }
        Returns: string[]
      }
      deduct_credits: {
        Args: {
          p_amount: number
          p_billing_account_id: string
          p_created_by: string
          p_description: string
          p_reference_id?: string
          p_reference_type?: string
          p_workspace_id: string
        }
        Returns: number
      }
      get_workspace_credits: {
        Args: { _workspace_id: string }
        Returns: number
      }
      has_project_collaboration: {
        Args: {
          _project_id: string
          _scopes?: Database["public"]["Enums"]["collaboration_scope"][]
        }
        Returns: boolean
      }
      increment_skill_executions: {
        Args: { p_increment?: number; p_skill_node_id: string }
        Returns: number
      }
      is_staff: {
        Args: { _required_roles?: Database["public"]["Enums"]["system_role"][] }
        Returns: boolean
      }
      is_workspace_member: {
        Args: {
          _roles?: Database["public"]["Enums"]["workspace_role"][]
          _workspace_id: string
        }
        Returns: boolean
      }
      update_report_with_version: {
        Args: {
          p_change_summary?: string
          p_change_type?: string
          p_content: Json
          p_expected_version: number
          p_report_id: string
          p_user_id?: string
        }
        Returns: number
      }
    }
    Enums: {
      account_type: "individual" | "company"
      collaboration_scope: "view" | "comment" | "edit" | "verify"
      collaboration_status:
        | "pending"
        | "accepted"
        | "declined"
        | "expired"
        | "revoked"
      correction_type:
        | "factual"
        | "citation"
        | "formatting"
        | "missing_info"
        | "wrong_code"
        | "unclear"
        | "other"
      credit_transaction_type:
        | "purchase"
        | "consumption"
        | "refund"
        | "bonus"
        | "adjustment"
        | "transfer"
      file_type: "plan_binder" | "corrections_letter" | "site_photo" | "other"
      flow_type:
        | "feasibility"
        | "corrections"
        | "city_review"
        | "permit_creation"
      message_role: "system" | "agent" | "user" | "tool"
      notification_channel: "in_app" | "email" | "push"
      notification_status: "pending" | "sent" | "read" | "dismissed"
      onboarding_status: "pending" | "in_progress" | "completed"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      pipeline_status:
        | "queued"
        | "running"
        | "awaiting_input"
        | "paused_credits"
        | "paused_manual"
        | "completed"
        | "failed"
        | "cancelled"
      profession_type:
        | "developer"
        | "architect"
        | "contractor"
        | "investor"
        | "property_owner"
        | "consultant"
        | "other"
      project_status:
        | "draft"
        | "ready"
        | "uploading"
        | "queued"
        | "processing"
        | "awaiting_input"
        | "paused"
        | "completed"
        | "failed"
        | "cancelled"
      referral_event_type:
        | "click"
        | "signup"
        | "first_purchase"
        | "report_ordered"
      report_status:
        | "draft"
        | "in_review"
        | "verified"
        | "published"
        | "archived"
      system_role: "super_admin" | "expert" | "sales" | "support" | "operations"
      verification_status:
        | "not_requested"
        | "pending"
        | "in_progress"
        | "verified"
        | "rejected"
      workspace_role: "owner" | "admin" | "member" | "viewer" | "collaborator"
      workspace_type: "personal" | "team" | "enterprise"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  feasiai: {
    Enums: {
      file_type: ["plan-binder", "corrections-letter", "other"],
      flow_phase: ["analysis", "response", "review", "feasibility"],
      flow_type: [
        "city-review",
        "corrections-analysis",
        "feasibility-analysis",
      ],
      message_role: ["system", "assistant", "tool"],
      project_status: [
        "ready",
        "uploading",
        "processing",
        "processing-phase1",
        "awaiting-answers",
        "processing-phase2",
        "completed",
        "failed",
        "processing-feasibility",
        "paused",
        "needs_review",
      ],
      question_type: [
        "text",
        "number",
        "choice",
        "multi_choice",
        "measurement",
      ],
    },
  },
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type: ["individual", "company"],
      collaboration_scope: ["view", "comment", "edit", "verify"],
      collaboration_status: [
        "pending",
        "accepted",
        "declined",
        "expired",
        "revoked",
      ],
      correction_type: [
        "factual",
        "citation",
        "formatting",
        "missing_info",
        "wrong_code",
        "unclear",
        "other",
      ],
      credit_transaction_type: [
        "purchase",
        "consumption",
        "refund",
        "bonus",
        "adjustment",
        "transfer",
      ],
      file_type: ["plan_binder", "corrections_letter", "site_photo", "other"],
      flow_type: [
        "feasibility",
        "corrections",
        "city_review",
        "permit_creation",
      ],
      message_role: ["system", "agent", "user", "tool"],
      notification_channel: ["in_app", "email", "push"],
      notification_status: ["pending", "sent", "read", "dismissed"],
      onboarding_status: ["pending", "in_progress", "completed"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      pipeline_status: [
        "queued",
        "running",
        "awaiting_input",
        "paused_credits",
        "paused_manual",
        "completed",
        "failed",
        "cancelled",
      ],
      profession_type: [
        "developer",
        "architect",
        "contractor",
        "investor",
        "property_owner",
        "consultant",
        "other",
      ],
      project_status: [
        "draft",
        "ready",
        "uploading",
        "queued",
        "processing",
        "awaiting_input",
        "paused",
        "completed",
        "failed",
        "cancelled",
      ],
      referral_event_type: [
        "click",
        "signup",
        "first_purchase",
        "report_ordered",
      ],
      report_status: [
        "draft",
        "in_review",
        "verified",
        "published",
        "archived",
      ],
      system_role: ["super_admin", "expert", "sales", "support", "operations"],
      verification_status: [
        "not_requested",
        "pending",
        "in_progress",
        "verified",
        "rejected",
      ],
      workspace_role: ["owner", "admin", "member", "viewer", "collaborator"],
      workspace_type: ["personal", "team", "enterprise"],
    },
  },
} as const


export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      active_refresh_tokens: {
        Row: {
          company_id: string;
          created_at: string;
          expires_at: string;
          id: number;
          last_used_at: string | null;
          metadata: Json | null;
          token_hash: string;
          user_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          expires_at: string;
          id?: number;
          last_used_at?: string | null;
          metadata?: Json | null;
          token_hash: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          expires_at?: string;
          id?: number;
          last_used_at?: string | null;
          metadata?: Json | null;
          token_hash?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          company_id: string;
          created_at: string;
          date: string;
          id: string;
          message: string;
          related_student_id: string | null;
          title: string;
          type: Database['public']['Enums']['announcement_type'];
          updated_at: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          date?: string;
          id?: string;
          message: string;
          related_student_id?: string | null;
          title: string;
          type: Database['public']['Enums']['announcement_type'];
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          date?: string;
          id?: string;
          message?: string;
          related_student_id?: string | null;
          title?: string;
          type?: Database['public']['Enums']['announcement_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'announcements_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'announcements_related_student_id_fkey';
            columns: ['related_student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      assigned_tasks: {
        Row: {
          actual_points_awarded: number | null;
          assigned_by_id: string;
          assigned_date: string;
          company_id: string;
          completed_date: string | null;
          created_at: string;
          id: string;
          is_complete: boolean;
          student_id: string;
          task_attachment_path: string | null;
          task_base_points: number;
          task_description: string;
          task_link_url: string | null;
          task_title: string;
          updated_at: string;
          verification_status: Database['public']['Enums']['verification_status'] | null;
          verified_by_id: string | null;
          verified_date: string | null;
        };
        Insert: {
          actual_points_awarded?: number | null;
          assigned_by_id: string;
          assigned_date?: string;
          company_id: string;
          completed_date?: string | null;
          created_at?: string;
          id?: string;
          is_complete?: boolean;
          student_id: string;
          task_attachment_path?: string | null;
          task_base_points: number;
          task_description: string;
          task_link_url?: string | null;
          task_title: string;
          updated_at?: string;
          verification_status?: Database['public']['Enums']['verification_status'] | null;
          verified_by_id?: string | null;
          verified_date?: string | null;
        };
        Update: {
          actual_points_awarded?: number | null;
          assigned_by_id?: string;
          assigned_date?: string;
          company_id?: string;
          completed_date?: string | null;
          created_at?: string;
          id?: string;
          is_complete?: boolean;
          student_id?: string;
          task_attachment_path?: string | null;
          task_base_points?: number;
          task_description?: string;
          task_link_url?: string | null;
          task_title?: string;
          updated_at?: string;
          verification_status?: Database['public']['Enums']['verification_status'] | null;
          verified_by_id?: string | null;
          verified_date?: string | null;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          timezone: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          timezone: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          timezone?: string;
        };
        Relationships: [];
      };
      instruments: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          image_path: string | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          image_path?: string | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          image_path?: string | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'instruments_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      journey_locations: {
        Row: {
          company_id: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'journey_locations_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_log: {
        Row: {
          company_id: string;
          created_at: string;
          data_payload: Json | null;
          id: number;
          message: string;
          provider_response: Json | null;
          push_token_used: string | null;
          recipient_profile_id: string;
          status: Database['public']['Enums']['notification_status'];
          title: string;
          trigger_event: Database['public']['Enums']['notification_trigger_event'];
        };
        Insert: {
          company_id: string;
          created_at?: string;
          data_payload?: Json | null;
          id?: number;
          message: string;
          provider_response?: Json | null;
          push_token_used?: string | null;
          recipient_profile_id: string;
          status?: Database['public']['Enums']['notification_status'];
          title: string;
          trigger_event: Database['public']['Enums']['notification_trigger_event'];
        };
        Update: {
          company_id?: string;
          created_at?: string;
          data_payload?: Json | null;
          id?: number;
          message?: string;
          provider_response?: Json | null;
          push_token_used?: string | null;
          recipient_profile_id?: string;
          status?: Database['public']['Enums']['notification_status'];
          title?: string;
          trigger_event?: Database['public']['Enums']['notification_trigger_event'];
        };
        Relationships: [
          {
            foreignKeyName: 'notification_log_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_log_recipient_profile_id_fkey';
            columns: ['recipient_profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      onetime_pins: {
        Row: {
          claimed_at: string | null;
          company_id: string;
          created_at: string;
          expires_at: string;
          pin: string;
          target_role: string;
          user_id: string;
        };
        Insert: {
          claimed_at?: string | null;
          company_id: string;
          created_at?: string;
          expires_at: string;
          pin: string;
          target_role: string;
          user_id: string;
        };
        Update: {
          claimed_at?: string | null;
          company_id?: string;
          created_at?: string;
          expires_at?: string;
          pin?: string;
          target_role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      parent_students: {
        Row: {
          created_at: string;
          parent_id: string;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          parent_id: string;
          student_id: string;
        };
        Update: {
          created_at?: string;
          parent_id?: string;
          student_id?: string;
        };
        Relationships: [];
      };
      practice_logs: {
        Row: {
          company_id: string;
          created_at: string;
          id: number;
          log_date: string;
          student_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: number;
          log_date?: string;
          student_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: number;
          log_date?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'practice_logs_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'practice_logs_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          company_id: string;
          created_at: string;
          current_goal_reward_id: string | null;
          first_name: string;
          id: string;
          last_name: string;
          nickname: string | null;
          role: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          company_id: string;
          created_at?: string;
          current_goal_reward_id?: string | null;
          first_name: string;
          id: string;
          last_name: string;
          nickname?: string | null;
          role: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          company_id?: string;
          created_at?: string;
          current_goal_reward_id?: string | null;
          first_name?: string;
          id?: string;
          last_name?: string;
          nickname?: string | null;
          role?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_profiles_goal_reward';
            columns: ['current_goal_reward_id'];
            isOneToOne: false;
            referencedRelation: 'rewards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profiles_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      push_tokens: {
        Row: {
          company_id: string;
          created_at: string;
          id: number;
          token: string;
          user_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: number;
          token: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: number;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      rewards: {
        Row: {
          company_id: string;
          cost: number;
          created_at: string;
          description: string | null;
          id: string;
          image_path: string | null;
          is_goal_eligible: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          cost: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          is_goal_eligible?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          cost?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_path?: string | null;
          is_goal_eligible?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rewards_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      student_instruments: {
        Row: {
          created_at: string;
          instrument_id: string;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          instrument_id: string;
          student_id: string;
        };
        Update: {
          created_at?: string;
          instrument_id?: string;
          student_id?: string;
        };
        Relationships: [];
      };
      student_teachers: {
        Row: {
          created_at: string;
          student_id: string;
          teacher_id: string;
        };
        Insert: {
          created_at?: string;
          student_id: string;
          teacher_id: string;
        };
        Update: {
          created_at?: string;
          student_id?: string;
          teacher_id?: string;
        };
        Relationships: [];
      };
      task_library: {
        Row: {
          attachment_path: string | null;
          base_tickets: number;
          can_self_assign: boolean;
          company_id: string;
          created_at: string;
          created_by_id: string;
          description: string | null;
          id: string;
          journey_location_id: string | null;
          reference_url: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          attachment_path?: string | null;
          base_tickets: number;
          can_self_assign?: boolean;
          company_id: string;
          created_at?: string;
          created_by_id: string;
          description?: string | null;
          id?: string;
          journey_location_id?: string | null;
          reference_url?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          attachment_path?: string | null;
          base_tickets?: number;
          can_self_assign?: boolean;
          company_id?: string;
          created_at?: string;
          created_by_id?: string;
          description?: string | null;
          id?: string;
          journey_location_id?: string | null;
          reference_url?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_task_library_journey_location';
            columns: ['journey_location_id'];
            isOneToOne: false;
            referencedRelation: 'journey_locations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_library_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_library_created_by_id_fkey';
            columns: ['created_by_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      task_library_instruments: {
        Row: {
          created_at: string;
          instrument_id: string;
          task_library_id: string;
        };
        Insert: {
          created_at?: string;
          instrument_id: string;
          task_library_id: string;
        };
        Update: {
          created_at?: string;
          instrument_id?: string;
          task_library_id?: string;
        };
        Relationships: [];
      };
      ticket_transactions: {
        Row: {
          amount: number;
          company_id: string;
          id: number;
          notes: string | null;
          source_id: string | null;
          student_id: string;
          timestamp: string;
          type: Database['public']['Enums']['transaction_type'];
        };
        Insert: {
          amount: number;
          company_id: string;
          id?: number;
          notes?: string | null;
          source_id?: string | null;
          student_id: string;
          timestamp?: string;
          type: Database['public']['Enums']['transaction_type'];
        };
        Update: {
          amount?: number;
          company_id?: string;
          id?: number;
          notes?: string | null;
          source_id?: string | null;
          student_id?: string;
          timestamp?: string;
          type?: Database['public']['Enums']['transaction_type'];
        };
        Relationships: [];
      };
      user_credentials: {
        Row: {
          company_id: string;
          pin_hash: string | null;
          user_id: string;
        };
        Insert: {
          company_id: string;
          pin_hash?: string | null;
          user_id: string;
        };
        Update: {
          company_id?: string;
          pin_hash?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_student_or_parent_mark_task_complete: {
        Args: { task_id: string };
        Returns: boolean;
      };
      can_student_or_parent_update_profile_limited: {
        Args: { profile_id: string };
        Returns: boolean;
      };
      get_assigned_task_details: {
        Args: { p_assignment_id: string };
        Returns: {
          id: string;
          student_id: string;
          assigned_by_id: string;
          assigned_date: string;
          task_title: string;
          task_description: string;
          task_base_points: number;
          is_complete: boolean;
          completed_date: string;
          verification_status: Database['public']['Enums']['verification_status'];
          verified_by_id: string;
          verified_date: string;
          actual_points_awarded: number;
          task_link_url: string;
          task_attachment_path: string;
          assigner_first_name: string;
          assigner_last_name: string;
          assigner_nickname: string;
          verifier_first_name: string;
          verifier_last_name: string;
          verifier_nickname: string;
          student_profile_status: string;
        }[];
      };
      get_assigned_tasks_filtered: {
        Args: {
          p_page?: number;
          p_limit?: number;
          p_assignment_status?: string;
          p_student_status?: string;
          p_student_id?: string;
          p_teacher_id?: string;
        };
        Returns: {
          id: string;
          student_id: string;
          assigned_by_id: string;
          assigned_date: string;
          task_title: string;
          task_description: string;
          task_base_points: number;
          is_complete: boolean;
          completed_date: string;
          verification_status: Database['public']['Enums']['verification_status'];
          verified_by_id: string;
          verified_date: string;
          actual_points_awarded: number;
          task_link_url: string;
          task_attachment_path: string;
          student_profile_status: string;
          assigner_first_name: string;
          assigner_last_name: string;
          assigner_nickname: string;
          verifier_first_name: string;
          verifier_last_name: string;
          verifier_nickname: string;
          total_count: number;
        }[];
      };
      get_company_streak_stats: {
        Args: { p_company_id: string };
        Returns: {
          total_active_streaks: number;
          streaks_over_7_days: number;
          milestone_earners_this_month: number;
        }[];
      };
      get_current_user_company_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_full_task_library: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          title: string;
          description: string;
          base_tickets: number;
          created_by_id: string;
          attachment_path: string;
          reference_url: string;
          can_self_assign: boolean;
          journey_location_id: string;
          instrument_ids: string[];
        }[];
      };
      get_student_balance: {
        Args: { p_student_id: string };
        Returns: number;
      };
      get_student_streak_details: {
        Args: { p_student_id: string };
        Returns: {
          current_streak: number;
          longest_streak: number;
          last_log_date: string;
        }[];
      };
      get_user_company_id: {
        Args: { p_user_id: string };
        Returns: string;
      };
      is_active_admin: {
        Args: { user_id: string };
        Returns: boolean;
      };
      is_active_admin_or_teacher: {
        Args: { user_id: string };
        Returns: boolean;
      };
      is_active_teacher: {
        Args: { user_id: string };
        Returns: boolean;
      };
      redeem_reward_for_student: {
        Args: {
          p_redeemer_id: string;
          p_student_id: string;
          p_reward_id: string;
          p_company_id: string;
        };
        Returns: {
          success: boolean;
          message: string;
          new_balance: number;
        }[];
      };
    };
    Enums: {
      announcement_type:
        | 'announcement'
        | 'challenge'
        | 'redemption_celebration'
        | 'streak_milestone';
      notification_status: 'pending' | 'sent' | 'error' | 'token_not_found';
      notification_trigger_event:
        | 'cron_staff_daily_briefing'
        | 'cron_student_practice_reminder'
        | 'cron_parent_practice_reminder'
        | 'milestone_celebration_student'
        | 'milestone_celebration_parent'
        | 'manual_admin_announcement'
        | 'teacher_nudge'
        | 'task_assigned'
        | 'task_verified';
      transaction_type: 'task_award' | 'manual_add' | 'manual_subtract' | 'redemption';
      verification_status: 'pending' | 'verified' | 'partial' | 'incomplete';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      announcement_type: [
        'announcement',
        'challenge',
        'redemption_celebration',
        'streak_milestone',
      ],
      notification_status: ['pending', 'sent', 'error', 'token_not_found'],
      notification_trigger_event: [
        'cron_staff_daily_briefing',
        'cron_student_practice_reminder',
        'cron_parent_practice_reminder',
        'milestone_celebration_student',
        'milestone_celebration_parent',
        'manual_admin_announcement',
        'teacher_nudge',
        'task_assigned',
        'task_verified',
      ],
      transaction_type: ['task_award', 'manual_add', 'manual_subtract', 'redemption'],
      verification_status: ['pending', 'verified', 'partial', 'incomplete'],
    },
  },
} as const;
